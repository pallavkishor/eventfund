import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
   
  timestamp, 
  boolean, 
  decimal,
 
  primaryKey
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for event managers
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Events table
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  date: timestamp("date").notNull(),
  venue: varchar("venue").notNull(),
  accessCode: varchar("access_code").notNull().unique(),
  targetAmount: decimal("target_amount", { precision: 10, scale: 2 }),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event managers junction table (for co-managers)
export const eventManagers = pgTable("event_managers", {
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.eventId, table.userId] })
}));

// Contributors table (guest users for events)
export const contributors = pgTable("contributors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone"),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Contributions table
export const contributions = pgTable("contributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  message: text("message"),
  status: varchar("status", { enum: ["pending", "approved", "rejected"] }).default("pending"),
  contributorId: varchar("contributor_id").notNull().references(() => contributors.id, { onDelete: "cascade" }),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  approvedById: varchar("approved_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Expenses table
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  description: varchar("description").notNull(),
  category: varchar("category").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  addedById: varchar("added_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Manager invites table
export const managerInvites = pgTable("manager_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: varchar("token").notNull().unique(),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  invitedBy: varchar("invited_by").notNull().references(() => users.id),
  email: varchar("email").notNull(),
  used: boolean("used").default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: varchar("token").notNull().unique(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  used: boolean("used").default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  createdEvents: many(events),
  eventManagers: many(eventManagers),
  approvedContributions: many(contributions),
  expenses: many(expenses),
  sentInvites: many(managerInvites),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [events.createdById],
    references: [users.id],
  }),
  eventManagers: many(eventManagers),
  contributors: many(contributors),
  contributions: many(contributions),
  expenses: many(expenses),
  invites: many(managerInvites),
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
}));

export const contributorsRelations = relations(contributors, ({ one, many }) => ({
  event: one(events, {
    fields: [contributors.eventId],
    references: [events.id],
  }),
  contributions: many(contributions),
}));

export const contributionsRelations = relations(contributions, ({ one }) => ({
  contributor: one(contributors, {
    fields: [contributions.contributorId],
    references: [contributors.id],
  }),
  event: one(events, {
    fields: [contributions.eventId],
    references: [events.id],
  }),
  approvedBy: one(users, {
    fields: [contributions.approvedById],
    references: [users.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  event: one(events, {
    fields: [expenses.eventId],
    references: [events.id],
  }),
  addedBy: one(users, {
    fields: [expenses.addedById],
    references: [users.id],
  }),
}));

export const managerInvitesRelations = relations(managerInvites, ({ one }) => ({
  event: one(events, {
    fields: [managerInvites.eventId],
    references: [events.id],
  }),
  invitedBy: one(users, {
    fields: [managerInvites.invitedBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  firstName: true,
  lastName: true,
});

export const insertEventSchema = createInsertSchema(events).pick({
  title: true,
  date: true,
  venue: true,
  targetAmount: true,
}).extend({
  date: z.string().min(1, "Date is required").transform((str) => new Date(str)),
});

export const insertContributorSchema = createInsertSchema(contributors).pick({
  name: true,
  email: true,
  phone: true,
  eventId: true,
});

export const insertContributionSchema = createInsertSchema(contributions).pick({
  amount: true,
  message: true,
  contributorId: true,
  eventId: true,
}).extend({
  amount: z.union([z.string(), z.number()]).transform((val) => val.toString()),
});

export const insertExpenseSchema = createInsertSchema(expenses).pick({
  description: true,
  category: true,
  amount: true,
  eventId: true,
}).extend({
  amount: z.union([z.string(), z.number()]).transform((val) => val.toString()),
});

export const insertManagerInviteSchema = createInsertSchema(managerInvites).pick({
  eventId: true,
  email: true,
});

export const updateEventSchema = createInsertSchema(events).pick({
  title: true,
  date: true,
  venue: true,
}).extend({
  date: z.string().min(1, "Date is required").transform((str) => new Date(str)),
});

export const updateExpenseSchema = createInsertSchema(expenses).pick({
  description: true,
  category: true,
  amount: true,
}).extend({
  amount: z.union([z.string(), z.number()]).transform((val) => val.toString()),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const passwordResetSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).pick({
  userId: true,
  token: true,
  expiresAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Contributor = typeof contributors.$inferSelect;
export type InsertContributor = z.infer<typeof insertContributorSchema>;
export type Contribution = typeof contributions.$inferSelect;
export type InsertContribution = z.infer<typeof insertContributionSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type ManagerInvite = typeof managerInvites.$inferSelect;
export type InsertManagerInvite = z.infer<typeof insertManagerInviteSchema>;
export type EventManager = typeof eventManagers.$inferSelect;
export type UpdateEvent = z.infer<typeof updateEventSchema>;
export type UpdateExpense = z.infer<typeof updateExpenseSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
