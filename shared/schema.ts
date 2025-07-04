import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  decimal,
  primaryKey,
  unique
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for sessions)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Companies table
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  siret: varchar("siret", { length: 14 }).unique(),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  sector: varchar("sector", { length: 100 }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  role: varchar("role", { length: 50 }).notNull(), // 'salaried' | 'council_member'
  roles: text("roles").array(), // Multiple roles support
  companyId: integer("company_id").references(() => companies.id),
  permissions: jsonb("permissions").notNull(),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Meeting types table
export const meetingTypes = pgTable("meeting_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }).default("#3B82F6"), // Hex color
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Meeting type access control table
export const meetingTypeAccess = pgTable("meeting_type_access", {
  id: serial("id").primaryKey(),
  meetingTypeId: integer("meeting_type_id").references(() => meetingTypes.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }),
  accessLevel: varchar("access_level", { length: 50 }).default("view").notNull(), // 'view' | 'edit' | 'admin'
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Un utilisateur ou une entreprise ne peut avoir qu'un seul niveau d'accès par type de réunion
  uniqueUserAccess: unique().on(table.meetingTypeId, table.userId),
  uniqueCompanyAccess: unique().on(table.meetingTypeId, table.companyId),
}));

// Meeting type roles table - associe les types de réunions aux rôles
export const meetingTypeRoles = pgTable("meeting_type_roles", {
  id: serial("id").primaryKey(),
  meetingTypeId: integer("meeting_type_id").references(() => meetingTypes.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueRoleAccess: unique().on(table.meetingTypeId, table.role),
}));

// Meetings table
export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  meetingTypeId: integer("meeting_type_id").references(() => meetingTypes.id, { onDelete: "set null" }),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  status: varchar("status", { length: 50 }).notNull().default("draft"), // 'draft' | 'scheduled' | 'in_progress' | 'completed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Meeting participants table
export const meetingParticipants = pgTable(
  "meeting_participants",
  {
    meetingId: integer("meeting_id").references(() => meetings.id, { onDelete: "cascade" }).notNull(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("invited"), // 'invited' | 'present' | 'absent' | 'excused' | 'proxy'
    proxyCompanyId: integer("proxy_company_id").references(() => companies.id, { onDelete: "set null" }), // entreprise à qui le pouvoir est donné
    joinedAt: timestamp("joined_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.meetingId, table.userId] }),
  })
);

// Agenda items table
export const agendaItems = pgTable("agenda_items", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").references(() => meetings.id, { onDelete: "cascade" }).notNull(),
  parentId: integer("parent_id"), // for subsections - self reference added after table creation
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  content: text("content"),
  duration: integer("duration").notNull(), // in minutes
  type: varchar("type", { length: 50 }).notNull(), // 'procedural' | 'presentation' | 'discussion'
  visualLink: text("visual_link"),
  orderIndex: integer("order_index").notNull(),
  level: integer("level").notNull().default(1), // 1 = section principale, 2 = sous-section, etc.
  sectionType: varchar("section_type", { length: 50 }).notNull().default("main"), // 'main' | 'subsection' | 'discussion' | 'procedural'
  status: varchar("status", { length: 50 }).notNull().default("pending"), // 'pending' | 'in_progress' | 'completed'
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Votes table
export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  agendaItemId: integer("agenda_item_id").references(() => agendaItems.id, { onDelete: "cascade" }).notNull(),
  question: text("question").notNull(),
  options: jsonb("options").notNull(), // array of strings
  isOpen: boolean("is_open").default(true),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
});

// Vote responses table
export const voteResponses = pgTable(
  "vote_responses",
  {
    id: serial("id").primaryKey(),
    voteId: integer("vote_id").references(() => votes.id, { onDelete: "cascade" }).notNull(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    option: varchar("option", { length: 100 }).notNull(),
    votingForCompanyId: integer("voting_for_company_id").references(() => companies.id, { onDelete: "set null" }), // entreprise pour laquelle on vote (si procuration)
    castByUserId: integer("cast_by_user_id").references(() => users.id, { onDelete: "set null" }), // utilisateur qui a effectivement voté (si délégation salarié)
    createdAt: timestamp("created_at").defaultNow().notNull(),
  }
);

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  createdMeetings: many(meetings),
  participations: many(meetingParticipants),
  voteResponses: many(voteResponses),
  createdVotes: many(votes),
}));

export const meetingTypesRelations = relations(meetingTypes, ({ many }) => ({
  meetings: many(meetings),
  accessControls: many(meetingTypeAccess),
  roleAccess: many(meetingTypeRoles),
}));

export const meetingTypeAccessRelations = relations(meetingTypeAccess, ({ one }) => ({
  meetingType: one(meetingTypes, {
    fields: [meetingTypeAccess.meetingTypeId],
    references: [meetingTypes.id],
  }),
  user: one(users, {
    fields: [meetingTypeAccess.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [meetingTypeAccess.companyId],
    references: [companies.id],
  }),
}));

export const meetingTypeRolesRelations = relations(meetingTypeRoles, ({ one }) => ({
  meetingType: one(meetingTypes, {
    fields: [meetingTypeRoles.meetingTypeId],
    references: [meetingTypes.id],
  }),
}));

export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  creator: one(users, {
    fields: [meetings.createdBy],
    references: [users.id],
  }),
  meetingType: one(meetingTypes, {
    fields: [meetings.meetingTypeId],
    references: [meetingTypes.id],
  }),
  participants: many(meetingParticipants),
  agendaItems: many(agendaItems),
}));

export const meetingParticipantsRelations = relations(meetingParticipants, ({ one }) => ({
  meeting: one(meetings, {
    fields: [meetingParticipants.meetingId],
    references: [meetings.id],
  }),
  user: one(users, {
    fields: [meetingParticipants.userId],
    references: [users.id],
  }),
}));

export const agendaItemsRelations = relations(agendaItems, ({ one, many }) => ({
  meeting: one(meetings, {
    fields: [agendaItems.meetingId],
    references: [meetings.id],
  }),
  parent: one(agendaItems, {
    fields: [agendaItems.parentId],
    references: [agendaItems.id],
  }),
  subsections: many(agendaItems),
  votes: many(votes),
}));

export const votesRelations = relations(votes, ({ one, many }) => ({
  agendaItem: one(agendaItems, {
    fields: [votes.agendaItemId],
    references: [agendaItems.id],
  }),
  creator: one(users, {
    fields: [votes.createdBy],
    references: [users.id],
  }),
  responses: many(voteResponses),
}));

export const voteResponsesRelations = relations(voteResponses, ({ one }) => ({
  vote: one(votes, {
    fields: [voteResponses.voteId],
    references: [votes.id],
  }),
  user: one(users, {
    fields: [voteResponses.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMeetingTypeSchema = createInsertSchema(meetingTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMeetingTypeAccessSchema = createInsertSchema(meetingTypeAccess).omit({
  id: true,
  createdAt: true,
});

export const insertMeetingTypeRoleSchema = createInsertSchema(meetingTypeRoles).omit({
  id: true,
  createdAt: true,
});

export const insertMeetingSchema = createInsertSchema(meetings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  date: z.string().or(z.date()).transform((val) => {
    return typeof val === 'string' ? new Date(val) : val;
  }),
});

export const insertAgendaItemSchema = createInsertSchema(agendaItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVoteSchema = createInsertSchema(votes).omit({
  id: true,
  createdAt: true,
  closedAt: true,
});

export const insertVoteResponseSchema = createInsertSchema(voteResponses).omit({
  createdAt: true,
});

// Types
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type MeetingType = typeof meetingTypes.$inferSelect;
export type InsertMeetingType = z.infer<typeof insertMeetingTypeSchema>;
export type MeetingTypeAccess = typeof meetingTypeAccess.$inferSelect;
export type InsertMeetingTypeAccess = z.infer<typeof insertMeetingTypeAccessSchema>;
export type MeetingTypeRole = typeof meetingTypeRoles.$inferSelect;
export type InsertMeetingTypeRole = z.infer<typeof insertMeetingTypeRoleSchema>;
export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type AgendaItem = typeof agendaItems.$inferSelect;
export type InsertAgendaItem = z.infer<typeof insertAgendaItemSchema>;
export type Vote = typeof votes.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;
export type VoteResponse = typeof voteResponses.$inferSelect;
export type InsertVoteResponse = z.infer<typeof insertVoteResponseSchema>;
export type MeetingParticipant = typeof meetingParticipants.$inferSelect;
