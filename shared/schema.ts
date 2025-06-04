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
  primaryKey
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

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

// Structures table
export const structures = pgTable("structures", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
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
  role: varchar("role", { length: 50 }).notNull(), // 'Salarié·es SCC' | 'Elu·es'
  structure: varchar("structure", { length: 200 }), // Structure représentée pour les élus
  permissions: jsonb("permissions").notNull(),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Meetings table
export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
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
    status: varchar("status", { length: 20 }).default("pending").notNull(), // 'present' | 'absent' | 'excused' | 'proxy' | 'pending'
    proxyToUserId: integer("proxy_to_user_id").references(() => users.id),
    proxyToStructure: varchar("proxy_to_structure", { length: 200 }),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    updatedBy: integer("updated_by").references(() => users.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.meetingId, table.userId] }),
  })
);

// Agenda items table
export const agendaItems = pgTable("agenda_items", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").references(() => meetings.id).notNull(),
  parentId: integer("parent_id").references(() => agendaItems.id), // for subsections
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  content: text("content"),
  duration: integer("duration").notNull(), // in minutes
  type: varchar("type", { length: 50 }).notNull(), // 'procedural' | 'presentation' | 'discussion'
  visualLink: text("visual_link"),
  orderIndex: integer("order_index").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // 'pending' | 'in_progress' | 'completed'
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Votes table
export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  agendaItemId: integer("agenda_item_id").references(() => agendaItems.id).notNull(),
  question: text("question").notNull(),
  options: jsonb("options").notNull(), // array of strings
  isOpen: boolean("is_open").default(true),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
});

// Vote responses table
export const voteResponses = pgTable(
  "vote_responses",
  {
    voteId: integer("vote_id").references(() => votes.id).notNull(),
    userId: integer("user_id").references(() => users.id).notNull(),
    option: varchar("option", { length: 100 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.voteId, table.userId] }),
  })
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  createdMeetings: many(meetings),
  participations: many(meetingParticipants),
  voteResponses: many(voteResponses),
  createdVotes: many(votes),
}));

export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  creator: one(users, {
    fields: [meetings.createdBy],
    references: [users.id],
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
  proxyToUser: one(users, {
    fields: [meetingParticipants.proxyToUserId],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [meetingParticipants.updatedBy],
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
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

export const insertStructureSchema = createInsertSchema(structures).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Structure = typeof structures.$inferSelect;
export type InsertStructure = z.infer<typeof insertStructureSchema>;
export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type AgendaItem = typeof agendaItems.$inferSelect;
export type InsertAgendaItem = z.infer<typeof insertAgendaItemSchema>;
export type Vote = typeof votes.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;
export type VoteResponse = typeof voteResponses.$inferSelect;
export type InsertVoteResponse = z.infer<typeof insertVoteResponseSchema>;
export type MeetingParticipant = typeof meetingParticipants.$inferSelect;
