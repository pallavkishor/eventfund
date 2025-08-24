import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Events table
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  time: varchar("time", { length: 10 }),
  venue: varchar("venue", { length: 255 }).notNull(),
  accessCode: varchar("access_code", { length: 20 }).notNull().unique(),
  contributionInstructions: text("contribution_instructions"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event managers (for co-manager functionality)
export const eventManagers = pgTable("event_managers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: varchar("role", { length: 20 }).notNull().default('co-manager'), // 'owner' or 'co-manager'
  invitedBy: varchar("invited_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Manager invitations
export const managerInvitations = pgTable("manager_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: 'cascade' }),
  email: varchar("email", { length: 255 }).notNull(),
  inviteToken: varchar("invite_token", { length: 100 }).notNull().unique(),
  invitedBy: varchar("invited_by").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Contributions
export const contributions = pgTable("contributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: 'cascade' }),
  contributorName: varchar("contributor_name", { length: 255 }).notNull(),
  contributorPhone: varchar("contributor_phone", { length: 20 }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
  paymentDetails: text("payment_details"),
  comments: text("comments"),
  status: varchar("status", { length: 20 }).notNull().default('pending'), // 'pending', 'approved', 'rejected'
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Expenses
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  category: varchar("category", { length: 50 }),
  date: timestamp("date").notNull(),
  receiptUrl: varchar("receipt_url", { length: 500 }),
  addedBy: varchar("added_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  createdEvents: many(events),
  eventManagers: many(eventManagers),
  sentInvitations: many(managerInvitations),
  approvedContributions: many(contributions),
  expenses: many(expenses),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  creator: one(users, {
    fields: [events.createdBy],
    references: [users.id],
  }),
  managers: many(eventManagers),
  invitations: many(managerInvitations),
  contributions: many(contributions),
  expenses: many(expenses),
}));

export const eventManagersRelations = relations(eventManagers, ({ one }) => ({
  event: one(events, {
    fields: [eventManagers.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventManagers.userId],
    references: [users.id],
  }),
  invitedBy: one(users, {
    fields: [eventManagers.invitedBy],
    references: [users.id],
  }),
}));

export const managerInvitationsRelations = relations(managerInvitations, ({ one }) => ({
  event: one(events, {
    fields: [managerInvitations.eventId],
    references: [events.id],
  }),
  invitedBy: one(users, {
    fields: [managerInvitations.invitedBy],
    references: [users.id],
  }),
}));

export const contributionsRelations = relations(contributions, ({ one }) => ({
  event: one(events, {
    fields: [contributions.eventId],
    references: [events.id],
  }),
  approvedBy: one(users, {
    fields: [contributions.approvedBy],
    references: [users.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  event: one(events, {
    fields: [expenses.eventId],
    references: [events.id],
  }),
  addedBy: one(users, {
    fields: [expenses.addedBy],
    references: [users.id],
  }),
}));

// Updated insert schemas with proper date handling
export const insertEventSchema = createInsertSchema(events, {
  date: z.string().or(z.date()).transform((val) => {
    if (typeof val === 'string') {
      return new Date(val);
    }
    return val;
  }),
}).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContributionSchema = createInsertSchema(contributions).omit({
  id: true,
  status: true,
  approvedBy: true,
  approvedAt: true,
  rejectionReason: true,
  createdAt: true,
});

export const insertExpenseSchema = createInsertSchema(expenses, {
  date: z.string().or(z.date()).transform((val) => {
    if (typeof val === 'string') {
      return new Date(val);
    }
    return val;
  }),
}).omit({
  id: true,
  addedBy: true,
  createdAt: true,
  updatedAt: true,
});

export const insertManagerInvitationSchema = createInsertSchema(managerInvitations).omit({
  id: true,
  inviteToken: true,
  invitedBy: true,
  expiresAt: true,
  usedAt: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Event = typeof events.$inferSelect;
export type EventWithDetails = Event & {
  creator: User;
  totalCollected: string;
  totalExpenses: string;
  contributorsCount: number;
  pendingRequests: number;
};
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Contribution = typeof contributions.$inferSelect;
export type InsertContribution = z.infer<typeof insertContributionSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type EventManager = typeof eventManagers.$inferSelect;
export type ManagerInvitation = typeof managerInvitations.$inferSelect;
export type InsertManagerInvitation = z.infer<typeof insertManagerInvitationSchema>;