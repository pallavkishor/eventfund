import {
  users,
  events,
  eventManagers,
  contributors,
  contributions,
  expenses,
  managerInvites,
  passwordResetTokens,
  type User,
  type InsertUser,
  type Event,
  type InsertEvent,
  type Contributor,
  type InsertContributor,
  type Contribution,
  type InsertContribution,
  type Expense,
  type InsertExpense,
  type ManagerInvite,
  type InsertManagerInvite,
  type EventManager,
  type UpdateEvent,
  type UpdateExpense,
  type PasswordResetToken,
  type InsertPasswordResetToken,
} from "../shared/schema.ts";
import { db } from "./db.ts";
import { eq, and, desc, sql, gt } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Event operations
  getEvent(id: string): Promise<Event | undefined>;
  getEventByAccessCode(accessCode: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent & { createdById: string }): Promise<Event>;
  updateEvent(id: string, event: UpdateEvent): Promise<Event>;
  getEventsByManager(userId: string): Promise<Event[]>;

  // Event manager operations
  addEventManager(eventId: string, userId: string): Promise<void>;
  isEventManager(eventId: string, userId: string): Promise<boolean>;
  getEventManagers(eventId: string): Promise<User[]>;

  // Contributor operations
  getContributor(id: string): Promise<Contributor | undefined>;
  getContributorByEmail(eventId: string, email: string): Promise<Contributor | undefined>;
  createContributor(contributor: InsertContributor): Promise<Contributor>;

  // Contribution operations
  getContribution(id: string): Promise<Contribution | undefined>;
  createContribution(contribution: InsertContribution): Promise<Contribution>;
  updateContributionStatus(id: string, status: "approved" | "rejected", approvedById: string): Promise<Contribution>;
  getEventContributions(eventId: string): Promise<Contribution[]>;
  getContributorContributions(contributorId: string): Promise<Contribution[]>;
  getEventStats(eventId: string): Promise<{
    totalCollected: string;
    totalContributors: number;
    pendingRequests: number;
    totalExpenses: string;
  }>;

  // Expense operations
  createExpense(expense: InsertExpense & { addedById: string }): Promise<Expense>;
  getEventExpenses(eventId: string): Promise<Expense[]>;

  // Manager invite operations
  createManagerInvite(invite: InsertManagerInvite & { invitedBy: string; token: string; expiresAt: Date }): Promise<ManagerInvite>;
  getManagerInvite(token: string): Promise<ManagerInvite | undefined>;
  useManagerInvite(token: string): Promise<void>;

  // Expense operations
  updateExpense(id: string, expense: UpdateExpense): Promise<Expense>;

  // Password reset operations
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  usePasswordResetToken(token: string): Promise<void>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<void>;
  cleanupExpiredInvites(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async getEventByAccessCode(accessCode: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.accessCode, accessCode));
    return event;
  }

  async updateEvent(id: string, eventData: UpdateEvent): Promise<Event> {
    const [updatedEvent] = await db
      .update(events)
      .set({ ...eventData, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return updatedEvent;
  }

  async createEvent(event: InsertEvent & { createdById: string }): Promise<Event> {
    // Generate unique access code
    const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const [newEvent] = await db.insert(events).values({
      ...event,
      accessCode,
    }).returning();
    
    // Add creator as event manager
    await this.addEventManager(newEvent.id, event.createdById);
    
    return newEvent;
  }

  async getEventsByManager(userId: string): Promise<Event[]> {
    const results = await db
      .select({ event: events })
      .from(events)
      .innerJoin(eventManagers, eq(events.id, eventManagers.eventId))
      .where(eq(eventManagers.userId, userId))
      .orderBy(desc(events.createdAt));
    
    return results.map(r => r.event);
  }

  async addEventManager(eventId: string, userId: string): Promise<void> {
    await db.insert(eventManagers).values({ eventId, userId });
  }

  async isEventManager(eventId: string, userId: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(eventManagers)
      .where(and(eq(eventManagers.eventId, eventId), eq(eventManagers.userId, userId)));
    return !!result;
  }

  async getEventManagers(eventId: string): Promise<User[]> {
    const results = await db
      .select({ user: users })
      .from(users)
      .innerJoin(eventManagers, eq(users.id, eventManagers.userId))
      .where(eq(eventManagers.eventId, eventId));
    
    return results.map(r => r.user);
  }

  async getContributor(id: string): Promise<Contributor | undefined> {
    const [contributor] = await db.select().from(contributors).where(eq(contributors.id, id));
    return contributor;
  }

  async getContributorByEmail(eventId: string, email: string): Promise<Contributor | undefined> {
    const [contributor] = await db
      .select()
      .from(contributors)
      .where(and(eq(contributors.eventId, eventId), eq(contributors.email, email)));
    return contributor;
  }

  async createContributor(contributor: InsertContributor): Promise<Contributor> {
    const [newContributor] = await db.insert(contributors).values(contributor).returning();
    return newContributor;
  }

  async getContribution(id: string): Promise<Contribution | undefined> {
    const [contribution] = await db.select().from(contributions).where(eq(contributions.id, id));
    return contribution;
  }

  async createContribution(contribution: InsertContribution): Promise<Contribution> {
    const [newContribution] = await db.insert(contributions).values(contribution).returning();
    return newContribution;
  }

  async updateContributionStatus(id: string, status: "approved" | "rejected", approvedById: string): Promise<Contribution> {
    const [contribution] = await db
      .update(contributions)
      .set({ status, approvedById, updatedAt: new Date() })
      .where(eq(contributions.id, id))
      .returning();
    return contribution;
  }

  async getEventContributions(eventId: string): Promise<Contribution[]> {
    return await db
      .select()
      .from(contributions)
      .where(eq(contributions.eventId, eventId))
      .orderBy(desc(contributions.createdAt));
  }

  async getContributorContributions(contributorId: string): Promise<Contribution[]> {
    return await db
      .select()
      .from(contributions)
      .where(eq(contributions.contributorId, contributorId))
      .orderBy(desc(contributions.createdAt));
  }

  async getEventStats(eventId: string): Promise<{
    totalCollected: string;
    totalContributors: number;
    pendingRequests: number;
    totalExpenses: string;
  }> {
    // Get total collected (approved contributions only)
    const [collectedResult] = await db
      .select({ 
        total: sql<string>`COALESCE(SUM(${contributions.amount}), 0)` 
      })
      .from(contributions)
      .where(and(eq(contributions.eventId, eventId), eq(contributions.status, "approved")));

    // Get total contributors
    const [contributorsResult] = await db
      .select({ 
        count: sql<number>`COUNT(DISTINCT ${contributors.id})` 
      })
      .from(contributors)
      .where(eq(contributors.eventId, eventId));

    // Get pending requests
    const [pendingResult] = await db
      .select({ 
        count: sql<number>`COUNT(*)` 
      })
      .from(contributions)
      .where(and(eq(contributions.eventId, eventId), eq(contributions.status, "pending")));

    // Get total expenses
    const [expensesResult] = await db
      .select({ 
        total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)` 
      })
      .from(expenses)
      .where(eq(expenses.eventId, eventId));

    return {
      totalCollected: collectedResult.total || "0",
      totalContributors: contributorsResult.count || 0,
      pendingRequests: pendingResult.count || 0,
      totalExpenses: expensesResult.total || "0",
    };
  }

  async createExpense(expense: InsertExpense & { addedById: string }): Promise<Expense> {
    const [newExpense] = await db.insert(expenses).values(expense).returning();
    return newExpense;
  }

  async updateExpense(id: string, expenseData: UpdateExpense): Promise<Expense> {
    const [updatedExpense] = await db
      .update(expenses)
      .set(expenseData)
      .where(eq(expenses.id, id))
      .returning();
    return updatedExpense;
  }

  async getEventExpenses(eventId: string): Promise<Expense[]> {
    return await db
      .select()
      .from(expenses)
      .where(eq(expenses.eventId, eventId))
      .orderBy(desc(expenses.createdAt));
  }

  async createManagerInvite(invite: InsertManagerInvite & { invitedBy: string; token: string; expiresAt: Date }): Promise<ManagerInvite> {
    const [newInvite] = await db.insert(managerInvites).values(invite).returning();
    return newInvite;
  }

  async getManagerInvite(token: string): Promise<ManagerInvite | undefined> {
    const [invite] = await db
      .select()
      .from(managerInvites)
      .where(and(
        eq(managerInvites.token, token),
        eq(managerInvites.used, false),
        gt(managerInvites.expiresAt, new Date())
      ));
    return invite;
  }

  async useManagerInvite(token: string): Promise<void> {
    await db
      .update(managerInvites)
      .set({ used: true })
      .where(eq(managerInvites.token, token));
  }

  async cleanupExpiredInvites(): Promise<void> {
    await db
      .delete(managerInvites)
      .where(
        and(
          eq(managerInvites.used, false),
          sql`${managerInvites.expiresAt} < NOW()`
        )
      );
  }

  async createPasswordResetToken(tokenData: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [token] = await db.insert(passwordResetTokens).values(tokenData).returning();
    return token;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        eq(passwordResetTokens.used, false),
        gt(passwordResetTokens.expiresAt, new Date())
      ));
    return resetToken;
  }

  async usePasswordResetToken(token: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
