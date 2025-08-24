import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.ts";
import { setupAuth, isAuthenticated } from "./replitAuth.ts";
import { sendPasswordResetEmail, sendCoManagerInvitation } from "./services/emailService.ts";
import { upload, getFileUrl } from "./services/fileService.ts";
import { insertEventSchema, insertContributionSchema, insertExpenseSchema, insertManagerInvitationSchema } from "../shared/schema.ts";
import { randomUUID } from "crypto";
import express from "express";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Serve uploaded files
  app.use('/api/files', express.static(path.join(process.cwd(), 'uploads')));

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get('/api/logout', (req: any, res) => {
    // Clear the session and redirect to Replit Auth logout
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Error destroying session:", err);
      }
      // Redirect to home page after logout
      res.redirect('/');
    });
  });

  // Password reset routes
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const resetToken = randomUUID();
      // In a real app, you'd store this token in the database with expiration
      // For now, we'll just send the email
      
      const success = await sendPasswordResetEmail(email, resetToken);
      if (success) {
        res.json({ message: "Password reset email sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send password reset email" });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Event routes
  app.get('/api/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const events = await storage.getEventsByUserId(userId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.post('/api/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const eventData = insertEventSchema.parse(req.body);
      
      // Generate unique access code if not provided
      if (!eventData.accessCode) {
        eventData.accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      }

      const event = await storage.createEvent(eventData, userId);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.get('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const eventId = req.params.id;
      
      // Check if user is a manager of this event
      const isManager = await storage.isEventManager(eventId, userId);
      if (!isManager) {
        return res.status(403).json({ message: "Access denied" });
      }

      const event = await storage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.put('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const eventId = req.params.id;
      
      const isManager = await storage.isEventManager(eventId, userId);
      if (!isManager) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updates = insertEventSchema.partial().parse(req.body);
      const event = await storage.updateEvent(eventId, updates);
      res.json(event);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  app.delete('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const eventId = req.params.id;
      
      const isManager = await storage.isEventManager(eventId, userId);
      if (!isManager) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteEvent(eventId);
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Public event access (for contributors)
  app.get('/api/events/access/:code', async (req, res) => {
    try {
      const accessCode = req.params.code.toUpperCase();
      const event = await storage.getEventByAccessCode(accessCode);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      res.json(event);
    } catch (error) {
      console.error("Error accessing event:", error);
      res.status(500).json({ message: "Failed to access event" });
    }
  });

  // Contribution routes
  app.get('/api/events/:id/contributions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const eventId = req.params.id;
      
      const isManager = await storage.isEventManager(eventId, userId);
      if (!isManager) {
        return res.status(403).json({ message: "Access denied" });
      }

      const contributions = await storage.getContributionsByEventId(eventId);
      res.json(contributions);
    } catch (error) {
      console.error("Error fetching contributions:", error);
      res.status(500).json({ message: "Failed to fetch contributions" });
    }
  });

  app.post('/api/events/:id/contributions', async (req, res) => {
    try {
      const eventId = req.params.id;
      const contributionData = insertContributionSchema.parse({
        ...req.body,
        eventId,
      });

      const contribution = await storage.createContribution(contributionData);
      res.status(201).json(contribution);
    } catch (error) {
      console.error("Error creating contribution:", error);
      res.status(500).json({ message: "Failed to create contribution" });
    }
  });

  app.get('/api/events/:id/contributions/contributor/:name', async (req, res) => {
    try {
      const eventId = req.params.id;
      const contributorName = req.params.name;
      
      const contributions = await storage.getContributionsByContributorName(eventId, contributorName);
      res.json(contributions);
    } catch (error) {
      console.error("Error fetching contributor contributions:", error);
      res.status(500).json({ message: "Failed to fetch contributions" });
    }
  });

  app.put('/api/contributions/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contributionId = req.params.id;
      
      const contribution = await storage.approveContribution(contributionId, userId);
      res.json(contribution);
    } catch (error) {
      console.error("Error approving contribution:", error);
      res.status(500).json({ message: "Failed to approve contribution" });
    }
  });

  app.put('/api/contributions/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const contributionId = req.params.id;
      const { reason } = req.body;
      
      const contribution = await storage.rejectContribution(contributionId, reason);
      res.json(contribution);
    } catch (error) {
      console.error("Error rejecting contribution:", error);
      res.status(500).json({ message: "Failed to reject contribution" });
    }
  });

  // Expense routes
  app.get('/api/events/:id/expenses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const eventId = req.params.id;
      
      const isManager = await storage.isEventManager(eventId, userId);
      if (!isManager) {
        return res.status(403).json({ message: "Access denied" });
      }

      const expenses = await storage.getExpensesByEventId(eventId);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.get('/api/events/:id/expenses/public', async (req, res) => {
    try {
      const eventId = req.params.id;
      const expenses = await storage.getExpensesByEventId(eventId);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching public expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post('/api/events/:id/expenses', isAuthenticated, upload.single('receipt'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const eventId = req.params.id;
      
      const isManager = await storage.isEventManager(eventId, userId);
      if (!isManager) {
        return res.status(403).json({ message: "Access denied" });
      }

      const expenseData = insertExpenseSchema.parse({
        ...req.body,
        eventId,
        date: new Date(req.body.date),
        receiptUrl: req.file ? getFileUrl(req.file.filename) : undefined,
      });

      const expense = await storage.createExpense(expenseData, userId);
      res.status(201).json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  app.put('/api/expenses/:id', isAuthenticated, upload.single('receipt'), async (req: any, res) => {
    try {
      const expenseId = req.params.id;
      const updates = insertExpenseSchema.partial().parse({
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : undefined,
        receiptUrl: req.file ? getFileUrl(req.file.filename) : undefined,
      });

      const expense = await storage.updateExpense(expenseId, updates);
      res.json(expense);
    } catch (error) {
      console.error("Error updating expense:", error);
      res.status(500).json({ message: "Failed to update expense" });
    }
  });

  app.delete('/api/expenses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const expenseId = req.params.id;
      await storage.deleteExpense(expenseId);
      res.json({ message: "Expense deleted successfully" });
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // Manager invitation routes
  app.post('/api/events/:id/invite', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const eventId = req.params.id;
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const isManager = await storage.isEventManager(eventId, userId);
      if (!isManager) {
        return res.status(403).json({ message: "Access denied" });
      }

      const event = await storage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const inviter = await storage.getUser(userId);
      if (!inviter) {
        return res.status(404).json({ message: "Inviter not found" });
      }

      const invitation = await storage.createManagerInvitation(
        { eventId, email },
        userId
      );

      const inviterName = `${inviter.firstName || ''} ${inviter.lastName || ''}`.trim() || inviter.email || 'Event Manager';
      
      const success = await sendCoManagerInvitation(
        email,
        event.title,
        inviterName,
        invitation.inviteToken
      );

      if (success) {
        res.status(201).json({ message: "Invitation sent successfully", invitation });
      } else {
        res.status(500).json({ message: "Failed to send invitation email" });
      }
    } catch (error) {
      console.error("Error sending invitation:", error);
      res.status(500).json({ message: "Failed to send invitation" });
    }
  });

  app.get('/api/events/:id/invitations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const eventId = req.params.id;
      
      const isManager = await storage.isEventManager(eventId, userId);
      if (!isManager) {
        return res.status(403).json({ message: "Access denied" });
      }

      const pendingInvitations = await storage.getPendingInvitationsByEventId(eventId);
      const activeManagers = await storage.getActiveManagersByEventId(eventId);
      
      res.json({ pendingInvitations, activeManagers });
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  app.post('/api/invitations/:token/accept', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const token = req.params.token;
      
      await storage.useManagerInvitation(token, userId);
      res.json({ message: "Invitation accepted successfully" });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  // Statistics routes
  app.get('/api/events/:id/statistics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const eventId = req.params.id;
      
      const isManager = await storage.isEventManager(eventId, userId);
      if (!isManager) {
        return res.status(403).json({ message: "Access denied" });
      }

      const statistics = await storage.getEventStatistics(eventId);
      res.json(statistics);
    } catch (error) {
      console.error("Error fetching statistics:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  app.get('/api/statistics/high-value-contributors', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = req.query.eventId as string;
      const minAmount = parseInt(req.query.minAmount as string) || 100;
      
      const contributors = await storage.getHighValueContributors(eventId, minAmount);
      res.json(contributors);
    } catch (error) {
      console.error("Error fetching high-value contributors:", error);
      res.status(500).json({ message: "Failed to fetch high-value contributors" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
