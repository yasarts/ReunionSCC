import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import session from "express-session";
import MemoryStore from "memorystore";
import { 
  insertCompanySchema, 
  insertUserSchema, 
  insertMeetingSchema, 
  insertAgendaItemSchema, 
  insertVoteSchema, 
  insertVoteResponseSchema,
  insertMeetingParticipantSchema,
  insertMeetingTypeSchema,
  insertMeetingTypeAccessSchema,
  insertMeetingTypeRoleSchema
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { WebSocketServer, WebSocket } from "ws";
import { 
  generateMagicLinkToken, 
  verifyMagicLinkToken, 
  sendMagicLink, 
  generateSessionToken, 
  verifySessionToken 
} from "./auth";

// Session configuration
const MemStore = MemoryStore(session);

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "dev-secret-key-very-long-and-secure",
  store: new MemStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
    sameSite: 'lax'
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
      if (!user || !user.permissions || !user.permissions[permission as keyof typeof user.permissions]) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};

export function registerRoutes(app: Express): Promise<Server> {
  // Apply session middleware
  app.use(sessionMiddleware);

  const server = createServer(app);

  // WebSocket setup
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket) => {
    console.log("New WebSocket connection established");
    
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log("Received WebSocket message:", data);
        
        // Echo back or broadcast to other clients if needed
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      console.log("WebSocket connection closed");
    });
  });

  // =============================================================================
  // AUTHENTICATION ROUTES
  // =============================================================================

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

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
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

  // Magic link authentication routes
  app.post("/api/auth/send-magic-link", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const success = await sendMagicLink(email, baseUrl);

      res.json({ 
        message: "Si cette adresse email est enregistrée, vous recevrez un lien de connexion.", 
        success: true 
      });
    } catch (error) {
      console.error("Send magic link error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auth/magic-link", async (req: Request, res: Response) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Invalid token" });
      }

      const { email, valid } = verifyMagicLinkToken(token);
      
      if (!valid) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      (req.session as any).userId = user.id;
      res.redirect('/dashboard');
    } catch (error) {
      console.error("Magic link verification error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });




// Route temporaire pour créer l'admin - À SUPPRIMER après usage
app.post("/api/setup/create-admin", async (req: Request, res: Response) => {
  try {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    const user = await storage.createUser({
      email: "admin@scc-cirque.org",
      password: hashedPassword,
      firstName: "Admin",
      lastName: "SCC", 
      role: "Salarié·es SCC",
      permissions: {
        canEdit: true,
        canManageAgenda: true,
        canManageUsers: true,
        canCreateMeetings: true,
        canExport: true,
        canVote: true,
        canSeeVoteResults: true,
        canManageParticipants: true,
      }
    });
    
    res.json({ 
      status: "success", 
      message: "Admin user created successfully",
      email: user.email 
    });
  } catch (error) {
    console.error("Create admin error:", error);
    res.status(500).json({ error: error.message });
  }
});




  // =============================================================================
  // COMPANY ROUTES
  // =============================================================================

  app.get("/api/companies", async (req: any, res: Response) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Get companies error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/companies/:id", async (req: any, res: Response) => {
    try {
      const companyId = parseInt(req.params.id);
      if (isNaN(companyId)) {
        return res.status(400).json({ message: "Invalid company ID" });
      }

      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      res.json(company);
    } catch (error) {
      console.error("Get company error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/companies", requireAuth, requirePermission("canManageUsers"), async (req: any, res: Response) => {
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

  app.put("/api/companies/:id", requireAuth, requirePermission("canManageUsers"), async (req: any, res: Response) => {
    try {
      const companyId = parseInt(req.params.id);
      if (isNaN(companyId)) {
        return res.status(400).json({ message: "Invalid company ID" });
      }

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

  app.delete("/api/companies/:id", requireAuth, requirePermission("canManageUsers"), async (req: any, res: Response) => {
    try {
      const companyId = parseInt(req.params.id);
      if (isNaN(companyId)) {
        return res.status(400).json({ message: "Invalid company ID" });
      }

      await storage.deleteCompany(companyId);
      res.json({ message: "Company deleted successfully" });
    } catch (error) {
      console.error("Delete company error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // =============================================================================
  // USER ROUTES
  // =============================================================================

  app.get("/api/users", requireAuth, async (req: any, res: Response) => {
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

  app.get("/api/users/:id", requireAuth, async (req: any, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUser(userId);
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

  app.post("/api/users", requireAuth, requirePermission("canManageUsers"), async (req: any, res: Response) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid user data", errors: result.error.errors });
      }

      const hashedPassword = await bcrypt.hash(result.data.password, 10);
      const userData = { ...result.data, password: hashedPassword };

      const user = await storage.createUser(userData);
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/users/:id", requireAuth, requirePermission("canManageUsers"), async (req: any, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const result = insertUserSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid user data", errors: result.error.errors });
      }

      let updateData = { ...result.data };
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }

      const user = await storage.updateUser(userId, updateData);
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // =============================================================================
  // MEETING ROUTES
  // =============================================================================

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
      if (isNaN(meetingId)) {
        return res.status(400).json({ message: "Invalid meeting ID" });
      }

      const meeting = await storage.getMeeting(meetingId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }

      res.json(meeting);
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

      // Créer un premier élément d'agenda par défaut
      await storage.createAgendaItem({
        meetingId: meeting.id,
        title: "Ouverture de la réunion",
        description: "Début officiel de la réunion",
        content: "",
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

  app.put("/api/meetings/:id", requireAuth, requirePermission("canCreateMeetings"), async (req: any, res: Response) => {
    try {
      const meetingId = parseInt(req.params.id);
      if (isNaN(meetingId)) {
        return res.status(400).json({ message: "Invalid meeting ID" });
      }

      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      await storage.updateMeetingStatus(meetingId, status);
      res.json({ message: "Meeting status updated successfully" });
    } catch (error) {
      console.error("Update meeting error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // =============================================================================
  // MEETING PARTICIPANTS ROUTES
  // =============================================================================

  app.get("/api/meetings/:id/participants", requireAuth, async (req: any, res: Response) => {
    try {
      const meetingId = parseInt(req.params.id);
      if (isNaN(meetingId)) {
        return res.status(400).json({ message: "Invalid meeting ID" });
      }
      
      const participants = await storage.getMeetingParticipants(meetingId);
      res.json(participants);
    } catch (error) {
      console.error("Get meeting participants error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/meetings/:id/participants", requireAuth, requirePermission("canManageParticipants"), async (req: any, res: Response) => {
    try {
      const meetingId = parseInt(req.params.id);
      const { userId } = req.body;
      
      if (isNaN(meetingId) || !userId) {
        return res.status(400).json({ message: "Invalid meeting ID or user ID" });
      }
      
      await storage.addParticipant(meetingId, userId);
      res.json({ message: "Participant added successfully" });
    } catch (error) {
      console.error("Add participant error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/meetings/:id/participants/with-status", requireAuth, requirePermission("canManageParticipants"), async (req: any, res: Response) => {
    try {
      const meetingId = parseInt(req.params.id);
      const { userId, status, proxyCompanyId } = req.body;
      
      if (isNaN(meetingId) || !userId || !status) {
        return res.status(400).json({ message: "Invalid data provided" });
      }
      
      await storage.addParticipant(meetingId, userId);
      await storage.updateParticipantStatus(meetingId, userId, status, proxyCompanyId);
      
      res.json({ message: "Participant added with status successfully" });
    } catch (error) {
      console.error("Add participant with status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/meetings/:meetingId/participants/:userId/status", requireAuth, requirePermission("canManageParticipants"), async (req: any, res: Response) => {
    try {
      const meetingId = parseInt(req.params.meetingId);
      const userId = parseInt(req.params.userId);
      const { status, proxyCompanyId } = req.body;
      
      if (isNaN(meetingId) || isNaN(userId) || !status) {
        return res.status(400).json({ message: "Invalid data provided" });
      }
      
      await storage.updateParticipantStatus(meetingId, userId, status, proxyCompanyId);
      res.json({ message: "Participant status updated successfully" });
    } catch (error) {
      console.error("Update participant status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/meetings/:meetingId/participants/:userId", requireAuth, requirePermission("canManageParticipants"), async (req: any, res: Response) => {
    try {
      const meetingId = parseInt(req.params.meetingId);
      const userId = parseInt(req.params.userId);
      
      if (isNaN(meetingId) || isNaN(userId)) {
        return res.status(400).json({ message: "Invalid meeting ID or user ID" });
      }
      
      await storage.removeParticipant(meetingId, userId);
      res.json({ message: "Participant removed successfully" });
    } catch (error) {
      console.error("Remove participant error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // =============================================================================
  // AGENDA ROUTES
  // =============================================================================

  app.get("/api/meetings/:id/agenda", requireAuth, async (req: any, res: Response) => {
    try {
      const meetingIdParam = req.params.id;
      const meetingId = parseInt(meetingIdParam);
      
      if (isNaN(meetingId)) {
        console.log(`[DEBUG] Demo meeting requested: ${meetingIdParam}`);
        return res.status(404).json({ message: "Demo meetings use static data" });
      }
      
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
      if (isNaN(meetingId)) {
        return res.status(400).json({ message: "Invalid meeting ID" });
      }

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

  app.get("/api/agenda/:id", requireAuth, async (req: any, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "Invalid agenda item ID" });
      }

      const item = await storage.getAgendaItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Agenda item not found" });
      }

      res.json(item);
    } catch (error) {
      console.error("Get agenda item error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/agenda/:id", requireAuth, requirePermission("canManageAgenda"), async (req: any, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "Invalid agenda item ID" });
      }

      const updates = req.body;
      const updatedItem = await storage.updateAgendaItem(itemId, updates);
      res.json(updatedItem);
    } catch (error) {
      console.error("Update agenda item error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/agenda/:id", requireAuth, requirePermission("canManageAgenda"), async (req: any, res: Response) => {
    try {
      const itemId = req.params.id;
      
      // Pour les données de test avec des IDs en chaîne ou décimaux, on simule une suppression réussie
      if (isNaN(parseInt(itemId)) || itemId.includes('.')) {
        return res.json({ message: "Demo item deletion simulated" });
      }
      
      const itemIdNum = parseInt(itemId);
      await storage.deleteAgendaItem(itemIdNum);
      res.json({ message: "Agenda item deleted successfully" });
    } catch (error) {
      console.error("Delete agenda item error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update agenda content (special route for content editing)
  app.put("/api/agenda/:id/content", requireAuth, requirePermission("canEdit"), async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid agenda item ID" });
      }

      const { content } = req.body;
      console.log(`[DEBUG] Updating content for agenda item ${id}, content length: ${content?.length || 0}`);
      
      const updatedItem = await storage.updateAgendaItem(id, { content });
      console.log(`[DEBUG] Content updated successfully, new content length: ${updatedItem.content?.length || 0}`);
      
      // Notifier tous les clients WebSocket connectés de la mise à jour
      const meetingId = updatedItem.meetingId;
      if (meetingId) {
        const notificationMessage = JSON.stringify({
          type: 'content-updated',
          meetingId: meetingId,
          agendaItemId: id,
          timestamp: new Date().toISOString()
        });
        
        wss.clients.forEach((client: any) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(notificationMessage);
          }
        });
        console.log(`[DEBUG] WebSocket notification sent for agenda item ${id} in meeting ${meetingId}`);
      }
      
      res.json({ message: "Content updated successfully", updatedItem });
    } catch (error) {
      console.error("Update agenda content error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // =============================================================================
  // VOTE ROUTES
  // =============================================================================

  app.post("/api/agenda/:id/votes", requireAuth, requirePermission("canVote"), async (req: any, res: Response) => {
    try {
      const agendaItemId = parseInt(req.params.id);
      if (isNaN(agendaItemId)) {
        return res.status(400).json({ message: "Invalid agenda item ID" });
      }

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
      
      if (isNaN(agendaItemId)) {
        console.log("Invalid agenda item ID, returning empty array");
        return res.json([]);
      }
      
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
      if (isNaN(voteId)) {
        return res.status(400).json({ message: "Invalid vote ID" });
      }

      const voteResponseData = insertVoteResponseSchema.parse({
        ...req.body,
        voteId,
        userId: req.session.userId
      });

      await storage.castVote(voteResponseData);
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
      if (isNaN(voteId)) {
        return res.status(400).json({ message: "Invalid vote ID" });
      }

      const results = await storage.getVoteResults(voteId);
      res.json(results);
    } catch (error) {
      console.error("Get vote results error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/votes/:id/close", requireAuth, requirePermission("canVote"), async (req: any, res: Response) => {
    try {
      const voteId = parseInt(req.params.id);
      if (isNaN(voteId)) {
        return res.status(400).json({ message: "Invalid vote ID" });
      }

      await storage.closeVote(voteId);
      res.json({ message: "Vote closed successfully" });
    } catch (error) {
      console.error("Close vote error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

 // Cette section va à la fin du fichier server/routes.ts après la ligne 800

 app.delete("/api/votes/:id", requireAuth, requirePermission("canVote"), async (req: any, res: Response) => {
  try {
    const voteId = parseInt(req.params.id);
    if (isNaN(voteId)) {
      return res.status(400).json({ message: "Invalid vote ID" });
    }

    await storage.deleteVote(voteId);
    res.json({ message: "Vote deleted successfully" });
  } catch (error) {
    console.error("Delete vote error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// =============================================================================
// MEETING TYPE ROUTES
// =============================================================================

app.get("/api/meeting-types", requireAuth, async (req: any, res: Response) => {
  try {
    const meetingTypes = await storage.getMeetingTypes();
    res.json(meetingTypes);
  } catch (error) {
    console.error("Get meeting types error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/meeting-types/:id", requireAuth, async (req: any, res: Response) => {
  try {
    const meetingTypeId = parseInt(req.params.id);
    if (isNaN(meetingTypeId)) {
      return res.status(400).json({ message: "Invalid meeting type ID" });
    }

    const meetingType = await storage.getMeetingType(meetingTypeId);
    if (!meetingType) {
      return res.status(404).json({ message: "Meeting type not found" });
    }

    res.json(meetingType);
  } catch (error) {
    console.error("Get meeting type error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/meeting-types", requireAuth, requirePermission("canManageUsers"), async (req: any, res: Response) => {
  try {
    const result = insertMeetingTypeSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid meeting type data", errors: result.error.errors });
    }

    const meetingType = await storage.createMeetingType(result.data);
    res.status(201).json(meetingType);
  } catch (error) {
    console.error("Create meeting type error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.put("/api/meeting-types/:id", requireAuth, requirePermission("canManageUsers"), async (req: any, res: Response) => {
  try {
    const meetingTypeId = parseInt(req.params.id);
    if (isNaN(meetingTypeId)) {
      return res.status(400).json({ message: "Invalid meeting type ID" });
    }

    const result = insertMeetingTypeSchema.partial().safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid meeting type data", errors: result.error.errors });
    }

    const meetingType = await storage.updateMeetingType(meetingTypeId, result.data);
    res.json(meetingType);
  } catch (error) {
    console.error("Update meeting type error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/api/meeting-types/:id", requireAuth, requirePermission("canManageUsers"), async (req: any, res: Response) => {
  try {
    const meetingTypeId = parseInt(req.params.id);
    if (isNaN(meetingTypeId)) {
      return res.status(400).json({ message: "Invalid meeting type ID" });
    }

    await storage.deleteMeetingType(meetingTypeId);
    res.json({ message: "Meeting type deleted successfully" });
  } catch (error) {
    console.error("Delete meeting type error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// =============================================================================
// MEETING TYPE ACCESS ROUTES
// =============================================================================

app.get("/api/meeting-types/:id/access", requireAuth, async (req: any, res: Response) => {
  try {
    const meetingTypeId = parseInt(req.params.id);
    if (isNaN(meetingTypeId)) {
      return res.status(400).json({ message: "Invalid meeting type ID" });
    }

    const access = await storage.getMeetingTypeAccess(meetingTypeId);
    res.json(access);
  } catch (error) {
    console.error("Get meeting type access error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/meeting-types/:id/access", requireAuth, requirePermission("canManageUsers"), async (req: any, res: Response) => {
  try {
    const meetingTypeId = parseInt(req.params.id);
    if (isNaN(meetingTypeId)) {
      return res.status(400).json({ message: "Invalid meeting type ID" });
    }

    const result = insertMeetingTypeAccessSchema.safeParse({
      ...req.body,
      meetingTypeId
    });
    if (!result.success) {
      return res.status(400).json({ message: "Invalid access data", errors: result.error.errors });
    }

    const access = await storage.createMeetingTypeAccess(result.data);
    res.status(201).json(access);
  } catch (error) {
    console.error("Create meeting type access error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/api/meeting-type-access/:id", requireAuth, requirePermission("canManageUsers"), async (req: any, res: Response) => {
  try {
    const accessId = parseInt(req.params.id);
    if (isNaN(accessId)) {
      return res.status(400).json({ message: "Invalid access ID" });
    }

    await storage.deleteMeetingTypeAccess(accessId);
    res.json({ message: "Access deleted successfully" });
  } catch (error) {
    console.error("Delete meeting type access error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// =============================================================================
// USER ACCESSIBLE MEETING TYPES
// =============================================================================

app.get("/api/users/:id/meeting-types", requireAuth, async (req: any, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const meetingTypes = await storage.getUserAccessibleMeetingTypes(userId);
    res.json(meetingTypes);
  } catch (error) {
    console.error("Get user accessible meeting types error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// =============================================================================
// COMPATIBILITY ROUTES (for existing components)
// =============================================================================

// Enhanced votes route for sections (pour compatibilité avec les composants existants)
app.get("/api/sections/:id/votes/enhanced", requireAuth, async (req: any, res: Response) => {
  try {
    const sectionId = req.params.id;
    
    // Pour l'instant, retourner une structure vide compatible
    const enhancedVoteData = {
      votes: [],
      votableCompanies: [],
      userRole: "participant",
      canVoteForCompanies: false
    };
    
    res.json(enhancedVoteData);
  } catch (error) {
    console.error("Get enhanced votes error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// =============================================================================
// HEALTH CHECK
// =============================================================================

app.get("/api/health", (req: Request, res: Response) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

return Promise.resolve(server);
}