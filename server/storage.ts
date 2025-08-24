import {
  users,
  events,
  contributions,
  expenses,
  eventManagers,
  managerInvitations,
  type User,
  type UpsertUser,
  type Event,
  type EventWithDetails,
  type InsertEvent,
  type Contribution,
  type InsertContribution,
  type Expense,
  type InsertExpense,
  type EventManager,
  type ManagerInvitation,
  type InsertManagerInvitation,
} from "../shared/schema.ts";
import { db } from "./db.ts";
import { eq, and, desc, sum, count, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Event operations
  createEvent(event: InsertEvent, creatorId: string): Promise<Event>;
  getEventsByUserId(userId: string): Promise<EventWithDetails[]>;
  getEventByAccessCode(accessCode: string): Promise<EventWithDetails | undefined>;
  getEventById(eventId: string): Promise<EventWithDetails | undefined>;
  updateEvent(eventId: string, updates: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(eventId: string): Promise<void>;
  isEventManager(eventId: string, userId: string): Promise<boolean>;

  // Contribution operations
  createContribution(contribution: InsertContribution): Promise<Contribution>;
  getContributionsByEventId(eventId: string): Promise<Contribution[]>;
  getContributionsByContributorName(eventId: string, contributorName: string): Promise<Contribution[]>;
  approveContribution(contributionId: string, approverId: string): Promise<Contribution>;
  rejectContribution(contributionId: string, reason: string): Promise<Contribution>;

  // Expense operations
  createExpense(expense: InsertExpense, addedBy: string): Promise<Expense>;
  getExpensesByEventId(eventId: string): Promise<Expense[]>;
  updateExpense(expenseId: string, updates: Partial<InsertExpense>): Promise<Expense>;
  deleteExpense(expenseId: string): Promise<void>;

  // Manager invitation operations
  createManagerInvitation(invitation: InsertManagerInvitation, invitedBy: string): Promise<ManagerInvitation>;
  getManagerInvitationByToken(token: string): Promise<ManagerInvitation | undefined>;
  useManagerInvitation(token: string, userId: string): Promise<void>;
  getPendingInvitationsByEventId(eventId: string): Promise<ManagerInvitation[]>;
  getActiveManagersByEventId(eventId: string): Promise<(EventManager & { user: User })[]>;

  // Statistics
  getEventStatistics(eventId: string): Promise<{
    totalCollected: string;
    totalExpenses: string;
    contributorsCount: number;
    pendingRequests: number;
    remainingFunds: string;
  }>;
  getHighValueContributors(eventId?: string, minAmount?: number): Promise<Contribution[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Event operations
  async createEvent(event: InsertEvent, creatorId: string): Promise<Event> {
    const [createdEvent] = await db
      .insert(events)
      .values({
        ...event,
        createdBy: creatorId,
      })
      .returning();

    // Add creator as event manager with 'owner' role
    await db.insert(eventManagers).values({
      eventId: createdEvent.id,
      userId: creatorId,
      role: 'owner',
    });

    return createdEvent;
  }

  async getEventsByUserId(userId: string): Promise<EventWithDetails[]> {
    const userEvents = await db
      .select({
        event: events,
        creator: users,
      })
      .from(eventManagers)
      .innerJoin(events, eq(eventManagers.eventId, events.id))
      .innerJoin(users, eq(events.createdBy, users.id))
      .where(eq(eventManagers.userId, userId))
      .orderBy(desc(events.createdAt));

    const eventsWithDetails = await Promise.all(
      userEvents.map(async ({ event, creator }) => {
        const stats = await this.getEventStatistics(event.id);
        return {
          ...event,
          creator,
          ...stats,
        };
      })
    );

    return eventsWithDetails;
  }

  async getEventByAccessCode(accessCode: string): Promise<EventWithDetails | undefined> {
    const [result] = await db
      .select({
        event: events,
        creator: users,
      })
      .from(events)
      .innerJoin(users, eq(events.createdBy, users.id))
      .where(eq(events.accessCode, accessCode));

    if (!result) return undefined;

    const stats = await this.getEventStatistics(result.event.id);
    return {
      ...result.event,
      creator: result.creator,
      ...stats,
    };
  }

  async getEventById(eventId: string): Promise<EventWithDetails | undefined> {
    const [result] = await db
      .select({
        event: events,
        creator: users,
      })
      .from(events)
      .innerJoin(users, eq(events.createdBy, users.id))
      .where(eq(events.id, eventId));

    if (!result) return undefined;

    const stats = await this.getEventStatistics(eventId);
    return {
      ...result.event,
      creator: result.creator,
      ...stats,
    };
  }

  async updateEvent(eventId: string, updates: Partial<InsertEvent>): Promise<Event> {
    const [updatedEvent] = await db
      .update(events)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(events.id, eventId))
      .returning();
    return updatedEvent;
  }

  async deleteEvent(eventId: string): Promise<void> {
    await db.delete(events).where(eq(events.id, eventId));
  }

  async isEventManager(eventId: string, userId: string): Promise<boolean> {
    const [manager] = await db
      .select()
      .from(eventManagers)
      .where(and(eq(eventManagers.eventId, eventId), eq(eventManagers.userId, userId)));
    return !!manager;
  }

  // Contribution operations
  async createContribution(contribution: InsertContribution): Promise<Contribution> {
    const [createdContribution] = await db
      .insert(contributions)
      .values(contribution)
      .returning();
    return createdContribution;
  }

  async getContributionsByEventId(eventId: string): Promise<Contribution[]> {
    return db
      .select()
      .from(contributions)
      .where(eq(contributions.eventId, eventId))
      .orderBy(desc(contributions.createdAt));
  }

  async getContributionsByContributorName(eventId: string, contributorName: string): Promise<Contribution[]> {
    return db
      .select()
      .from(contributions)
      .where(and(
        eq(contributions.eventId, eventId),
        eq(contributions.contributorName, contributorName)
      ))
      .orderBy(desc(contributions.createdAt));
  }

  async approveContribution(contributionId: string, approverId: string): Promise<Contribution> {
    const [updatedContribution] = await db
      .update(contributions)
      .set({
        status: 'approved',
        approvedBy: approverId,
        approvedAt: new Date(),
      })
      .where(eq(contributions.id, contributionId))
      .returning();
    return updatedContribution;
  }

  async rejectContribution(contributionId: string, reason: string): Promise<Contribution> {
    const [updatedContribution] = await db
      .update(contributions)
      .set({
        status: 'rejected',
        rejectionReason: reason,
      })
      .where(eq(contributions.id, contributionId))
      .returning();
    return updatedContribution;
  }

  // Expense operations
  async createExpense(expense: InsertExpense, addedBy: string): Promise<Expense> {
    const [createdExpense] = await db
      .insert(expenses)
      .values({
        ...expense,
        addedBy,
      })
      .returning();
    return createdExpense;
  }

  async getExpensesByEventId(eventId: string): Promise<Expense[]> {
    return db
      .select()
      .from(expenses)
      .where(eq(expenses.eventId, eventId))
      .orderBy(desc(expenses.date));
  }

  async updateExpense(expenseId: string, updates: Partial<InsertExpense>): Promise<Expense> {
    const [updatedExpense] = await db
      .update(expenses)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(expenses.id, expenseId))
      .returning();
    return updatedExpense;
  }

  async deleteExpense(expenseId: string): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, expenseId));
  }

  // Manager invitation operations
  async createManagerInvitation(invitation: InsertManagerInvitation, invitedBy: string): Promise<ManagerInvitation> {
    const inviteToken = randomUUID();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now

    const [createdInvitation] = await db
      .insert(managerInvitations)
      .values({
        ...invitation,
        inviteToken,
        invitedBy,
        expiresAt,
      })
      .returning();
    return createdInvitation;
  }

  async getManagerInvitationByToken(token: string): Promise<ManagerInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(managerInvitations)
      .where(eq(managerInvitations.inviteToken, token));
    return invitation;
  }

  async useManagerInvitation(token: string, userId: string): Promise<void> {
    const invitation = await this.getManagerInvitationByToken(token);
    if (!invitation || invitation.usedAt || invitation.expiresAt < new Date()) {
      throw new Error('Invalid or expired invitation');
    }

    // Mark invitation as used
    await db
      .update(managerInvitations)
      .set({ usedAt: new Date() })
      .where(eq(managerInvitations.inviteToken, token));

    // Add user as event manager
    await db.insert(eventManagers).values({
      eventId: invitation.eventId,
      userId,
      role: 'co-manager',
      invitedBy: invitation.invitedBy,
    });
  }

  async getPendingInvitationsByEventId(eventId: string): Promise<ManagerInvitation[]> {
    return db
      .select()
      .from(managerInvitations)
      .where(and(
        eq(managerInvitations.eventId, eventId),
        eq(managerInvitations.usedAt, null as any)
      ))
      .orderBy(desc(managerInvitations.createdAt));
  }

  async getActiveManagersByEventId(eventId: string): Promise<(EventManager & { user: User })[]> {
    const managers = await db
      .select({
        manager: eventManagers,
        user: users,
      })
      .from(eventManagers)
      .innerJoin(users, eq(eventManagers.userId, users.id))
      .where(eq(eventManagers.eventId, eventId));

    return managers.map(({ manager, user }) => ({ ...manager, user }));
  }

  // Statistics
  async getEventStatistics(eventId: string): Promise<{
    totalCollected: string;
    totalExpenses: string;
    contributorsCount: number;
    pendingRequests: number;
    remainingFunds: string;
  }> {
    // Get approved contributions
    const [approvedContributionsResult] = await db
      .select({
        total: sum(contributions.amount),
        count: count(contributions.id),
      })
      .from(contributions)
      .where(and(
        eq(contributions.eventId, eventId),
        eq(contributions.status, 'approved')
      ));

    // Get pending contributions
    const [pendingContributionsResult] = await db
      .select({
        count: count(contributions.id),
      })
      .from(contributions)
      .where(and(
        eq(contributions.eventId, eventId),
        eq(contributions.status, 'pending')
      ));

    // Get total expenses
    const [expensesResult] = await db
      .select({
        total: sum(expenses.amount),
      })
      .from(expenses)
      .where(eq(expenses.eventId, eventId));

    const totalCollected = approvedContributionsResult?.total || '0';
    const totalExpenses = expensesResult?.total || '0';
    const contributorsCount = approvedContributionsResult?.count || 0;
    const pendingRequests = pendingContributionsResult?.count || 0;

    const remainingFunds = (parseFloat(totalCollected) - parseFloat(totalExpenses)).toFixed(2);

    return {
      totalCollected,
      totalExpenses,
      contributorsCount,
      pendingRequests,
      remainingFunds,
    };
  }

  async getHighValueContributors(eventId?: string, minAmount: number = 100): Promise<Contribution[]> {
    const conditions = [
      eq(contributions.status, 'approved'),
      sql`${contributions.amount} >= ${minAmount}`
    ];

    if (eventId) {
      conditions.push(eq(contributions.eventId, eventId));
    }

    return db
      .select()
      .from(contributions)
      .where(and(...conditions))
      .orderBy(desc(contributions.amount));
  }
}

export const storage = new DatabaseStorage();
