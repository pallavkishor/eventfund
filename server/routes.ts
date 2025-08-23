import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage.ts";
import bcrypt from "bcrypt";
import session from "express-session";
import { 
  insertUserSchema, 
  insertEventSchema, 
  insertContributorSchema, 
  insertContributionSchema,
  insertExpenseSchema,
  insertManagerInviteSchema,
  updateEventSchema,
  updateExpenseSchema,
  passwordResetRequestSchema,
  passwordResetSchema 
} from "../shared/schema.ts";
import { sendManagerInvite, sendPasswordResetEmail } from "./emailService.ts";
import { randomUUID } from "crypto";

const SALT_ROUNDS = 12;

interface AuthenticatedRequest extends Express.Request {
  session: session.Session & session.SessionData & {
    userId?: string;
  };
  body: any;
  params: any;
}

// Session middleware
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "dev-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
});

// Authentication middleware
const requireAuth = (req: AuthenticatedRequest, res: any, next: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

// Event manager authorization middleware
const requireEventManager = async (req: AuthenticatedRequest, res: any, next: any) => {
  const eventId = req.params.eventId || req.body.eventId;
  if (!eventId) {
    return res.status(400).json({ message: "Event ID required" });
  }

  const isManager = await storage.isEventManager(eventId, req.session.userId!);
  if (!isManager) {
    return res.status(403).json({ message: "Event manager access required" });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(sessionMiddleware);

  // WebSocket setup
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const clients = new Map<string, Set<WebSocket>>();

  wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const eventId = url.searchParams.get('eventId');
    
    if (eventId) {
      if (!clients.has(eventId)) {
        clients.set(eventId, new Set());
      }
      clients.get(eventId)!.add(ws);

      ws.on('close', () => {
        const eventClients = clients.get(eventId);
        if (eventClients) {
          eventClients.delete(ws);
          if (eventClients.size === 0) {
            clients.delete(eventId);
          }
        }
      });
    }
  });

  // Broadcast to event clients
  const broadcastToEvent = (eventId: string, data: any) => {
    const eventClients = clients.get(eventId);
    if (eventClients) {
      const message = JSON.stringify(data);
      eventClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  };

  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = insertUserSchema.parse(req.body);
      
      // Check if user exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      
      // Create user
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
      });

      (req as AuthenticatedRequest).session.userId = user.id;
      
      res.json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName 
        } 
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Registration failed" });
    }
  });

    app.post('/api/auth/login', async (req, res) => {
      try {
        const { email, password } = req.body;
        
        if (!email || !password) {
          return res.status(400).json({ message: "Email and password required" });
        }

        const user = await storage.getUserByEmail(email);
        if (!user) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        (req as AuthenticatedRequest).session.userId = user.id;
        
        res.json({ 
          user: { 
            id: user.id, 
            email: user.email, 
            firstName: user.firstName, 
            lastName: user.lastName 
          } 
        });
      } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Login failed" });
      }
    });

  app.post('/api/auth/logout', (req: AuthenticatedRequest, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out" });
    });
  });

  app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName 
        } 
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Event routes
  app.post('/api/events', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const eventData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent({
        ...eventData,
        createdById: req.session.userId!,
      });
      
      res.json(event);
    } catch (error) {
      console.error("Create event error:", error);
      res.status(400).json({ message: "Failed to create event" });
    }
  });

  app.put('/api/events/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const eventData = updateEventSchema.parse(req.body);
      
      // Check if user is event manager
      const isManager = await storage.isEventManager(id, req.session.userId!);
      if (!isManager) {
        return res.status(403).json({ message: "Event manager access required" });
      }
      
      const updatedEvent = await storage.updateEvent(id, eventData);
      res.json(updatedEvent);
    } catch (error) {
      console.error("Update event error:", error);
      res.status(400).json({ message: "Failed to update event" });
    }
  });

  app.get('/api/events/my', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const events = await storage.getEventsByManager(req.session.userId!);
      res.json(events);
    } catch (error) {
      console.error("Get events error:", error);
      res.status(500).json({ message: "Failed to get events" });
    }
  });

  app.get('/api/events/access/:accessCode', async (req, res) => {
    try {
      const { accessCode } = req.params;
      const event = await storage.getEventByAccessCode(accessCode);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const stats = await storage.getEventStats(event.id);
      const expenses = await storage.getEventExpenses(event.id);
      
      res.json({
        event,
        stats,
        expenses,
      });
    } catch (error) {
      console.error("Get event by access code error:", error);
      res.status(500).json({ message: "Failed to get event" });
    }
  });

  app.get('/api/events/:eventId', requireAuth, requireEventManager, async (req: AuthenticatedRequest, res) => {
    try {
      const { eventId } = req.params;
      const event = await storage.getEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const stats = await storage.getEventStats(eventId);
      const contributions = await storage.getEventContributions(eventId);
      const expenses = await storage.getEventExpenses(eventId);
      
      // Get contributor details for each contribution
      const contributionsWithDetails = await Promise.all(
        contributions.map(async (contribution) => {
          const contributor = await storage.getContributor(contribution.contributorId);
          return {
            ...contribution,
            contributor,
          };
        })
      );
      
      res.json({
        event,
        stats,
        contributions: contributionsWithDetails,
        expenses,
      });
    } catch (error) {
      console.error("Get event error:", error);
      res.status(500).json({ message: "Failed to get event" });
    }
  });

  // Contribution routes
  app.post('/api/contributions', async (req, res) => {
    try {
      const { contributorData, contributionData } = req.body;
      
      // Validate input
      const validatedContributor = insertContributorSchema.parse(contributorData);
      const validatedContribution = insertContributionSchema.parse(contributionData);
      
      // Check if event exists
      const event = await storage.getEvent(validatedContributor.eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Get or create contributor
      let contributor = await storage.getContributorByEmail(
        validatedContributor.eventId, 
        validatedContributor.email
      );
      
      if (!contributor) {
        contributor = await storage.createContributor(validatedContributor);
      }
      
      // Create contribution
      const contribution = await storage.createContribution({
        ...validatedContribution,
        contributorId: contributor.id,
      });
      
      // Broadcast update to event managers
      broadcastToEvent(event.id, {
        type: 'new_contribution',
        contribution: {
          ...contribution,
          contributor,
        },
      });
      
      res.json({ contribution, contributor });
    } catch (error) {
      console.error("Create contribution error:", error);
      res.status(400).json({ message: "Failed to create contribution" });
    }
  });

  app.patch('/api/contributions/:contributionId', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { contributionId } = req.params;
      const { status } = req.body;
      
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const contribution = await storage.getContribution(contributionId);
      if (!contribution) {
        return res.status(404).json({ message: "Contribution not found" });
      }
      
      // Check if user is event manager
      const isManager = await storage.isEventManager(contribution.eventId, req.session.userId!);
      if (!isManager) {
        return res.status(403).json({ message: "Event manager access required" });
      }
      
      const updatedContribution = await storage.updateContributionStatus(
        contributionId, 
        status, 
        req.session.userId!
      );
      
      // Get updated stats and broadcast
      const stats = await storage.getEventStats(contribution.eventId);
      broadcastToEvent(contribution.eventId, {
        type: 'contribution_updated',
        contribution: updatedContribution,
        stats,
      });
      
      res.json(updatedContribution);
    } catch (error) {
      console.error("Update contribution error:", error);
      res.status(500).json({ message: "Failed to update contribution" });
    }
  });

  app.get('/api/contributors/:contributorId/contributions', async (req, res) => {
    try {
      const { contributorId } = req.params;
      const contributions = await storage.getContributorContributions(contributorId);
      res.json(contributions);
    } catch (error) {
      console.error("Get contributor contributions error:", error);
      res.status(500).json({ message: "Failed to get contributions" });
    }
  });

  // Expense routes
  app.post('/api/expenses', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const expenseData = insertExpenseSchema.parse(req.body);
      
      // Check if user is event manager
      const isManager = await storage.isEventManager(expenseData.eventId, req.session.userId!);
      if (!isManager) {
        return res.status(403).json({ message: "Event manager access required" });
      }
      
      const expense = await storage.createExpense({
        ...expenseData,
        addedById: req.session.userId!,
      });
      
      // Get updated stats and broadcast
      const stats = await storage.getEventStats(expenseData.eventId);
      broadcastToEvent(expenseData.eventId, {
        type: 'expense_added',
        expense,
        stats,
      });
      
      res.json(expense);
    } catch (error) {
      console.error("Create expense error:", error);
      res.status(400).json({ message: "Failed to create expense" });
    }
  });

  app.put('/api/expenses/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const expenseData = updateExpenseSchema.parse(req.body);
      
      // Get the expense to check event access
      const expense = await storage.getEvent(req.body.eventId);
      if (!expense) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Check if user is event manager
      const isManager = await storage.isEventManager(req.body.eventId, req.session.userId!);
      if (!isManager) {
        return res.status(403).json({ message: "Event manager access required" });
      }
      
      const updatedExpense = await storage.updateExpense(id, expenseData);
      
      // Broadcast update to event managers
      const stats = await storage.getEventStats(req.body.eventId);
      broadcastToEvent(req.body.eventId, {
        type: 'expense_updated',
        expense: updatedExpense,
        stats,
      });
      
      res.json(updatedExpense);
    } catch (error) {
      console.error("Update expense error:", error);
      res.status(400).json({ message: "Failed to update expense" });
    }
  });

  // Manager invite routes
  app.post('/api/invites', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const inviteData = insertManagerInviteSchema.parse(req.body);
      
      // Check if user is event manager
      const isManager = await storage.isEventManager(inviteData.eventId, req.session.userId!);
      if (!isManager) {
        return res.status(403).json({ message: "Event manager access required" });
      }
      
      // Get event details for email
      const event = await storage.getEvent(inviteData.eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const token = randomUUID();
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
      
      const invite = await storage.createManagerInvite({
        ...inviteData,
        invitedBy: req.session.userId!,
        token,
        expiresAt,
      });
      
      // Send email invite
      const inviteLink = `${(req as any).protocol}://${(req as any).get('host')}/invite/${token}`;
      const emailSent = await sendManagerInvite(inviteData.email, inviteLink, event.title);
      
      if (!emailSent) {
        console.error("Failed to send invite email");
        // Don't fail the request, just log the error
      }
      
      res.json({ invite, inviteLink, emailSent });
    } catch (error) {
      console.error("Create invite error:", error);
      res.status(400).json({ message: "Failed to create invite" });
    }
  });

  app.get('/api/invites/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const invite = await storage.getManagerInvite(token);
      
      if (!invite) {
        return res.status(404).json({ message: "Invalid or expired invite" });
      }
      
      const event = await storage.getEvent(invite.eventId);
      res.json({ invite, event });
    } catch (error) {
      console.error("Get invite error:", error);
      res.status(500).json({ message: "Failed to get invite" });
    }
  });

  app.post('/api/invites/:token/accept', async (req: AuthenticatedRequest, res) => {
    try {
      const { token } = req.params;
      const invite = await storage.getManagerInvite(token);
      
      if (!invite) {
        return res.status(404).json({ message: "Invalid or expired invite" });
      }
      
      if (!req.session.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Add user as event manager
      await storage.addEventManager(invite.eventId, req.session.userId);
      
      // Mark invite as used
      await storage.useManagerInvite(token);
      
      res.json({ message: "Invite accepted successfully" });
    } catch (error) {
      console.error("Accept invite error:", error);
      res.status(500).json({ message: "Failed to accept invite" });
    }
  });

  // Password reset routes
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = passwordResetRequestSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ message: "If an account with that email exists, a password reset link has been sent." });
      }
      
      const token = randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      
      await storage.createPasswordResetToken({
        userId: user.id,
        token,
        expiresAt,
      });
      
      const resetLink = `${(req as any).protocol}://${(req as any).get('host')}/reset-password/${token}`;
      const emailSent = await sendPasswordResetEmail(email, resetLink);
      
      if (!emailSent) {
        console.error("Failed to send password reset email");
      }
      
      res.json({ message: "If an account with that email exists, a password reset link has been sent." });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, newPassword } = passwordResetSchema.parse(req.body);
      
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await storage.updateUserPassword(resetToken.userId, hashedPassword);
      await storage.usePasswordResetToken(token);
      
      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(400).json({ message: "Failed to reset password" });
    }
  });

  // Cleanup expired invites periodically
  setInterval(async () => {
    try {
      await storage.cleanupExpiredInvites();
    } catch (error) {
      console.error("Cleanup expired invites error:", error);
    }
  }, 60 * 60 * 1000); // Every hour

  return httpServer;
}
