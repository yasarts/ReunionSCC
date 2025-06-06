import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import session from "express-session";
import MemoryStore from "memorystore";
import { insertCompanySchema, insertUserSchema, insertMeetingSchema, insertAgendaItemSchema, insertVoteSchema, insertVoteResponseSchema } from "@shared/schema";
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
    secure: false, // Permettre les cookies non-sécurisés en développement
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // Configurer SameSite pour éviter les problèmes CORS
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
      if (!user || !user.permissions || !(user.permissions as any)[permission]) {
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

  // Company routes
  app.get("/api/companies", async (req: any, res: Response) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Get companies error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/companies", async (req: any, res: Response) => {
    try {
      const result = insertCompanySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid company data", errors: result.error.errors });
      }

      const company = await storage.createCompany(result.data);
      res.status(201).json(company);
    } catch (error) {
      console.error("Create company error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/companies/:id", async (req: any, res: Response) => {
    try {
      const companyId = parseInt(req.params.id);
      const result = insertCompanySchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid company data", errors: result.error.errors });
      }

      const company = await storage.updateCompany(companyId, result.data);
      res.json(company);
    } catch (error) {
      console.error("Update company error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/companies/:id", async (req: any, res: Response) => {
    try {
      const companyId = parseInt(req.params.id);
      await storage.deleteCompany(companyId);
      res.json({ message: "Company deleted successfully" });
    } catch (error) {
      console.error("Delete company error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User management routes
  app.get("/api/users", async (req: any, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(user => {
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/users", async (req: any, res: Response) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid user data", errors: result.error.errors });
      }

      // Hash the password before saving
      const hashedPassword = await bcrypt.hash(result.data.password, 10);
      const userData = { ...result.data, password: hashedPassword };

      const user = await storage.createUser(userData);
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/users/:id", async (req: any, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const result = insertUserSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid user data", errors: result.error.errors });
      }

      const user = await storage.updateUser(userId, result.data);
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Update user error:", error);
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
  app.get("/api/meetings/:id/participants", async (req: any, res: Response) => {
    try {
      const meetingId = parseInt(req.params.id);
      const participants = await storage.getMeetingParticipants(meetingId);
      res.json(participants);
    } catch (error) {
      console.error("Get participants error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/meetings/:id/eligible-users", requireAuth, async (req: any, res: Response) => {
    try {
      const meetingId = parseInt(req.params.id);
      const meeting = await storage.getMeeting(meetingId);
      
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }

      if (!meeting.meetingTypeId) {
        // Si pas de type de réunion spécifique, tous les utilisateurs sont éligibles
        const allUsers = await storage.getAllUsers();
        return res.json(allUsers.map(user => ({ ...user, company: null })));
      }

      const eligibleUsers = await storage.getEligibleUsersForMeeting(meeting.meetingTypeId);
      res.json(eligibleUsers);
    } catch (error) {
      console.error("Get eligible users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/meetings/:id/participants", async (req: any, res: Response) => {
    try {
      const meetingId = parseInt(req.params.id);
      const { userId } = req.body;

      console.log(`Adding participant: meetingId=${meetingId}, userId=${userId}`);
      await storage.addParticipant(meetingId, userId);
      console.log("Participant added successfully");
      res.json({ message: "Participant added successfully" });
    } catch (error) {
      console.error("Add participant error:", error);
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  });

  // Route combinée pour ajouter un participant avec un statut
  app.post("/api/meetings/:id/participants/with-status", async (req: any, res: Response) => {
    try {
      const meetingId = parseInt(req.params.id);
      const { userId, status, proxyCompanyId } = req.body;

      console.log(`Adding participant with status: meetingId=${meetingId}, userId=${userId}, status=${status}, proxyCompanyId=${proxyCompanyId}`);
      
      // Ajouter le participant
      await storage.addParticipant(meetingId, userId);
      
      // Définir le statut
      await storage.updateParticipantStatus(meetingId, userId, status, proxyCompanyId);
      
      console.log("Participant added with status successfully");
      res.json({ message: "Participant added with status successfully" });
    } catch (error) {
      console.error("Add participant with status error:", error);
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  });

  app.put("/api/meetings/:meetingId/participants/:userId/status", async (req: any, res: Response) => {
    try {
      const meetingId = parseInt(req.params.meetingId);
      const userId = parseInt(req.params.userId);
      const { status, proxyCompanyId } = req.body;

      console.log(`Updating participant status: meetingId=${meetingId}, userId=${userId}, status=${status}, proxyCompanyId=${proxyCompanyId}`);
      
      // Vérifier si le participant existe, sinon l'ajouter
      const participants = await storage.getMeetingParticipants(meetingId);
      const existingParticipant = participants.find(p => p.userId === userId);
      
      if (!existingParticipant) {
        console.log(`Participant ${userId} not found, adding to meeting ${meetingId}`);
        await storage.addParticipant(meetingId, userId);
      }

      await storage.updateParticipantStatus(meetingId, userId, status, proxyCompanyId);
      console.log(`Participant status updated successfully`);
      res.json({ message: "Participant status updated successfully" });
    } catch (error) {
      console.error("Update participant status error:", error);
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  });

  // Meeting types routes
  app.get("/api/meeting-types", async (req: any, res: Response) => {
    try {
      const meetingTypes = await storage.getMeetingTypes();
      res.json(meetingTypes);
    } catch (error) {
      console.error("Error fetching meeting types:", error);
      res.status(500).json({ message: "Failed to fetch meeting types" });
    }
  });

  app.get("/api/meeting-types/:id", requireAuth, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const meetingType = await storage.getMeetingType(id);
      if (!meetingType) {
        return res.status(404).json({ message: "Meeting type not found" });
      }
      res.json(meetingType);
    } catch (error) {
      console.error("Error fetching meeting type:", error);
      res.status(500).json({ message: "Failed to fetch meeting type" });
    }
  });

  app.post("/api/meeting-types", async (req: any, res: Response) => {
    try {
      const meetingType = await storage.createMeetingType(req.body);
      res.status(201).json(meetingType);
    } catch (error) {
      console.error("Error creating meeting type:", error);
      res.status(500).json({ message: "Failed to create meeting type" });
    }
  });

  app.put("/api/meeting-types/:id", async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const meetingType = await storage.updateMeetingType(id, req.body);
      res.json(meetingType);
    } catch (error) {
      console.error("Error updating meeting type:", error);
      res.status(500).json({ message: "Failed to update meeting type" });
    }
  });

  app.delete("/api/meeting-types/:id", requireAuth, requirePermission("canManageUsers"), async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMeetingType(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting meeting type:", error);
      res.status(500).json({ message: "Failed to delete meeting type" });
    }
  });

  // Meeting type access routes
  app.get("/api/meeting-types/:id/access", requireAuth, requirePermission("canManageUsers"), async (req: any, res: Response) => {
    try {
      const meetingTypeId = parseInt(req.params.id);
      const access = await storage.getMeetingTypeAccess(meetingTypeId);
      res.json(access);
    } catch (error) {
      console.error("Error fetching meeting type access:", error);
      res.status(500).json({ message: "Failed to fetch meeting type access" });
    }
  });

  app.post("/api/meeting-types/:id/access", async (req: any, res: Response) => {
    try {
      const meetingTypeId = parseInt(req.params.id);
      const accessData = { ...req.body, meetingTypeId };
      const access = await storage.createMeetingTypeAccess(accessData);
      res.status(201).json(access);
    } catch (error) {
      console.error("Error creating meeting type access:", error);
      res.status(500).json({ message: "Failed to create meeting type access" });
    }
  });

  app.delete("/api/meeting-type-access/:id", async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMeetingTypeAccess(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting meeting type access:", error);
      res.status(500).json({ message: "Failed to delete meeting type access" });
    }
  });

  app.get("/api/users/:id/accessible-meeting-types", requireAuth, async (req: any, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const meetingTypes = await storage.getUserAccessibleMeetingTypes(userId);
      res.json(meetingTypes);
    } catch (error) {
      console.error("Error fetching user accessible meeting types:", error);
      res.status(500).json({ message: "Failed to fetch accessible meeting types" });
    }
  });

  // Meeting type roles routes
  app.get("/api/meeting-types/:id/roles", async (req: any, res: Response) => {
    try {
      const meetingTypeId = parseInt(req.params.id);
      const roles = await storage.getMeetingTypeRoles(meetingTypeId);
      res.json(roles);
    } catch (error) {
      console.error("Error fetching meeting type roles:", error);
      res.status(500).json({ message: "Failed to fetch meeting type roles" });
    }
  });

  app.post("/api/meeting-types/:id/roles", async (req: any, res: Response) => {
    try {
      const meetingTypeId = parseInt(req.params.id);
      const { role } = req.body;
      const newRole = await storage.createMeetingTypeRole({ meetingTypeId, role });
      res.status(201).json(newRole);
    } catch (error) {
      console.error("Error creating meeting type role:", error);
      res.status(500).json({ message: "Failed to create meeting type role" });
    }
  });

  app.delete("/api/meeting-type-roles/:id", async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMeetingTypeRole(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting meeting type role:", error);
      res.status(500).json({ message: "Failed to delete meeting type role" });
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
