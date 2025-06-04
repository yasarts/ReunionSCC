import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import session from "express-session";
import MemoryStore from "memorystore";
import { insertUserSchema, insertMeetingSchema, insertAgendaItemSchema, insertVoteSchema, insertVoteResponseSchema, insertStructureSchema } from "@shared/schema";
import { z } from "zod";
import { WebSocketServer, WebSocket } from "ws";

// Session configuration
const MemStore = MemoryStore(session);

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "dev-secret-key",
  store: new MemStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
});

// Authentication middleware
const requireAuth = (req: any, res: Response, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Permission check middleware
const requirePermission = (permission: string) => {
  return async (req: any, res: Response, next: any) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const permissions = typeof user.permissions === 'string' 
        ? JSON.parse(user.permissions) 
        : user.permissions;
      
      if (!permissions || !permissions[permission]) {
        return res.status(403).json({ message: "Forbidden" });
      }
      req.user = user;
      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(sessionMiddleware);

  // Initialize default users if they don't exist
  const initializeUsers = async () => {
    try {
      const adminExists = await storage.getUserByEmail("admin@scc-cirque.org");
      if (!adminExists) {
        const hashedPassword = await bcrypt.hash("admin123", 10);
        await storage.createUser({
          email: "admin@scc-cirque.org",
          password: hashedPassword,
          firstName: "Admin",
          lastName: "SCC",
          role: "salaried",
          permissions: {
            canView: true,
            canEdit: true,
            canManageAgenda: true,
            canManageParticipants: true,
            canCreateMeetings: true,
            canManageUsers: true,
            canVote: true,
            canSeeVoteResults: true
          }
        });
      }

      const memberExists = await storage.getUserByEmail("christine.nissim@scc-cirque.org");
      if (!memberExists) {
        const hashedPassword = await bcrypt.hash("membre123", 10);
        await storage.createUser({
          email: "christine.nissim@scc-cirque.org",
          password: hashedPassword,
          firstName: "Christine",
          lastName: "Nissim",
          role: "council_member",
          permissions: {
            canView: true,
            canEdit: false,
            canManageAgenda: false,
            canManageParticipants: false,
            canCreateMeetings: false,
            canManageUsers: false,
            canVote: true,
            canSeeVoteResults: true
          }
        });
      }
    } catch (error) {
      console.error("Error initializing users:", error);
    }
  };

  await initializeUsers();

  // Auth routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      (req.session as any).userId = user.id;
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req: any, res: Response) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Meeting routes
  app.get("/api/meetings", requireAuth, async (req: any, res: Response) => {
    try {
      const meetings = await storage.getMeetingsByUser(req.session.userId);
      res.json(meetings);
    } catch (error) {
      console.error("Get meetings error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/meetings/:id", requireAuth, async (req: any, res: Response) => {
    try {
      const meetingId = parseInt(req.params.id);
      const meeting = await storage.getMeeting(meetingId);
      
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }

      // Check if user has access to this meeting
      const participants = await storage.getMeetingParticipants(meetingId);
      const isParticipant = participants.some(p => p.userId === req.session.userId);
      const user = await storage.getUser(req.session.userId);
      
      if (!isParticipant && meeting.createdBy !== req.session.userId && !user?.permissions.canView) {
        return res.status(403).json({ message: "Access denied" });
      }

      const agendaItems = await storage.getAgendaItems(meetingId);
      const meetingParticipants = await storage.getMeetingParticipants(meetingId);

      res.json({
        ...meeting,
        agendaItems,
        participants: meetingParticipants
      });
    } catch (error) {
      console.error("Get meeting error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/meetings", requireAuth, requirePermission("canCreateMeetings"), async (req: any, res: Response) => {
    try {
      const meetingData = insertMeetingSchema.parse({
        ...req.body,
        createdBy: req.session.userId
      });

      const meeting = await storage.createMeeting(meetingData);

      // Create default agenda item
      await storage.createAgendaItem({
        meetingId: meeting.id,
        title: "Ouverture de séance",
        description: "Accueil et vérification du quorum",
        content: "**Ouverture de la séance**\n\nAccueil des participants et vérification du quorum.",
        duration: 5,
        type: "procedural",
        orderIndex: 0,
        parentId: null,
        visualLink: null
      });

      res.status(201).json(meeting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Create meeting error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Agenda routes
  app.get("/api/meetings/:id/agenda", requireAuth, async (req: any, res: Response) => {
    try {
      const meetingId = parseInt(req.params.id);
      const agendaItems = await storage.getAgendaItems(meetingId);
      res.json(agendaItems);
    } catch (error) {
      console.error("Get agenda error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/meetings/:id/agenda", requireAuth, requirePermission("canManageAgenda"), async (req: any, res: Response) => {
    try {
      const meetingId = parseInt(req.params.id);
      const agendaData = insertAgendaItemSchema.parse({
        ...req.body,
        meetingId
      });

      const item = await storage.createAgendaItem(agendaData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Create agenda item error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/agenda/:id", requireAuth, requirePermission("canManageAgenda"), async (req: any, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      const updates = req.body;
      
      const updatedItem = await storage.updateAgendaItem(itemId, updates);
      res.json(updatedItem);
    } catch (error) {
      console.error("Update agenda item error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Vote routes
  app.post("/api/agenda/:id/votes", requireAuth, requirePermission("canVote"), async (req: any, res: Response) => {
    try {
      const agendaItemId = parseInt(req.params.id);
      const voteData = insertVoteSchema.parse({
        ...req.body,
        agendaItemId,
        createdBy: req.session.userId
      });

      const vote = await storage.createVote(voteData);
      res.status(201).json(vote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Create vote error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/agenda/:id/votes", requireAuth, async (req: any, res: Response) => {
    try {
      const agendaItemId = parseInt(req.params.id);
      const votes = await storage.getVotesByAgendaItem(agendaItemId);
      res.json(votes);
    } catch (error) {
      console.error("Get votes error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/votes/:id/cast", requireAuth, requirePermission("canVote"), async (req: any, res: Response) => {
    try {
      const voteId = parseInt(req.params.id);
      const { option } = req.body;

      const voteResponse = insertVoteResponseSchema.parse({
        voteId,
        userId: req.session.userId,
        option
      });

      await storage.castVote(voteResponse);
      res.json({ message: "Vote cast successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Cast vote error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/votes/:id/results", requireAuth, requirePermission("canSeeVoteResults"), async (req: any, res: Response) => {
    try {
      const voteId = parseInt(req.params.id);
      const results = await storage.getVoteResults(voteId);
      res.json(results);
    } catch (error) {
      console.error("Get vote results error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Participant routes
  app.get("/api/meetings/:id/participants", requireAuth, async (req: any, res: Response) => {
    try {
      const meetingId = parseInt(req.params.id);
      const participants = await storage.getMeetingParticipants(meetingId);
      res.json(participants);
    } catch (error) {
      console.error("Get participants error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/meetings/:id/participants", requireAuth, requirePermission("canManageParticipants"), async (req: any, res: Response) => {
    try {
      const meetingId = parseInt(req.params.id);
      const { userId } = req.body;

      await storage.addParticipant(meetingId, userId);
      res.json({ message: "Participant added successfully" });
    } catch (error) {
      console.error("Add participant error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/meetings/:meetingId/participants/:userId/status", requireAuth, async (req: any, res: Response) => {
    try {
      const meetingId = parseInt(req.params.meetingId);
      const userId = parseInt(req.params.userId);
      const { status, proxyToUserId, proxyToStructure, updatedBy } = req.body;

      await storage.updateParticipantStatus(meetingId, userId, status, proxyToUserId, proxyToStructure, updatedBy);
      res.json({ message: "Status updated successfully" });
    } catch (error) {
      console.error("Update status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/elected", requireAuth, async (req: any, res: Response) => {
    try {
      const electedMembers = await storage.getElectedMembers();
      res.json(electedMembers);
    } catch (error) {
      console.error("Get elected members error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/structures", requireAuth, async (req: any, res: Response) => {
    try {
      const structures = await storage.getStructures();
      res.json(structures);
    } catch (error) {
      console.error("Get structures error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin routes for user and structure management
  app.get("/api/admin/users", requireAuth, requirePermission("canManageUsers"), async (req: any, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users", requireAuth, requirePermission("canManageUsers"), async (req: any, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Hash password if provided
      if (userData.password) {
        userData.password = await bcrypt.hash(userData.password, 10);
      }
      
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.get("/api/admin/structures", requireAuth, requirePermission("canManageUsers"), async (req: any, res: Response) => {
    try {
      const structures = await storage.getAllStructures();
      res.json(structures);
    } catch (error) {
      console.error("Error fetching structures:", error);
      res.status(500).json({ message: "Failed to fetch structures" });
    }
  });

  app.post("/api/admin/structures", requireAuth, requirePermission("canManageUsers"), async (req: any, res: Response) => {
    try {
      const structureData = insertStructureSchema.parse(req.body);
      const structure = await storage.createStructure(structureData);
      res.json(structure);
    } catch (error) {
      console.error("Error creating structure:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid structure data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create structure" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time features
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const meetingRooms = new Map<number, Set<WebSocket>>();

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('WebSocket connection established');

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'join_meeting':
            const meetingId = message.meetingId;
            if (!meetingRooms.has(meetingId)) {
              meetingRooms.set(meetingId, new Set());
            }
            meetingRooms.get(meetingId)!.add(ws);
            break;

          case 'vote_cast':
            // Broadcast vote update to all meeting participants
            const voteResults = await storage.getVoteResults(message.voteId);
            const meetingClients = meetingRooms.get(message.meetingId);
            if (meetingClients) {
              meetingClients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'vote_update',
                    voteId: message.voteId,
                    results: voteResults
                  }));
                }
              });
            }
            break;

          case 'agenda_update':
            // Broadcast agenda changes to all meeting participants
            const agendaClients = meetingRooms.get(message.meetingId);
            if (agendaClients) {
              agendaClients.forEach(client => {
                if (client.readyState === WebSocket.OPEN && client !== ws) {
                  client.send(JSON.stringify({
                    type: 'agenda_update',
                    agendaItem: message.agendaItem
                  }));
                }
              });
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      // Remove from all meeting rooms
      meetingRooms.forEach((clients, meetingId) => {
        clients.delete(ws);
        if (clients.size === 0) {
          meetingRooms.delete(meetingId);
        }
      });
    });
  });

  return httpServer;
}
