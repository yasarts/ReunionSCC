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

// =============================================================================
// SESSION STORAGE TABLE
// =============================================================================

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// =============================================================================
// COMPANIES TABLE
// =============================================================================

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  siret: varchar("siret", { length: 14 }).unique(),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  sector: varchar("sector", { length: 100 }),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// =============================================================================
// USERS TABLE
// =============================================================================

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  role: varchar("role", { length: 50 }).notNull(), // 'Salarié·es SCC' | 'Conseil national'
  roles: text("roles").array(), // Multiple roles support for future
  companyId: integer("company_id").references(() => companies.id),
  permissions: jsonb("permissions").notNull().$type<{
    canEdit: boolean;
    canManageAgenda: boolean;
    canManageUsers: boolean;
    canCreateMeetings: boolean;
    canExport?: boolean;
    canVote: boolean;
    canSeeVoteResults: boolean;
    canManageParticipants: boolean;
  }>(),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  isActive: boolean("is_active").default(true).notNull(),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// =============================================================================
// MEETING TYPES TABLE
// =============================================================================

export const meetingTypes = pgTable("meeting_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }).default("#3B82F6"), // Hex color
  isActive: boolean("is_active").default(true).notNull(),
  requiresApproval: boolean("requires_approval").default(false).notNull(),
  maxParticipants: integer("max_participants"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// =============================================================================
// MEETING TYPE ACCESS TABLE
// =============================================================================

export const meetingTypeAccess = pgTable("meeting_type_access", {
  id: serial("id").primaryKey(),
  meetingTypeId: integer("meeting_type_id").references(() => meetingTypes.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }),
  accessLevel: varchar("access_level", { length: 20 }).notNull().default("participant"), // 'viewer', 'participant', 'moderator', 'admin'
  canCreateMeetings: boolean("can_create_meetings").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  // Ensure unique access per user per meeting type
  unique("unique_user_meeting_type").on(table.meetingTypeId, table.userId),
  // Ensure unique access per company per meeting type  
  unique("unique_company_meeting_type").on(table.meetingTypeId, table.companyId),
]);

// =============================================================================
// MEETING TYPE ROLES TABLE
// =============================================================================

export const meetingTypeRoles = pgTable("meeting_type_roles", {
  id: serial("id").primaryKey(),
  meetingTypeId: integer("meeting_type_id").references(() => meetingTypes.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role", { length: 50 }).notNull(), // User role that can access this meeting type
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("unique_meeting_type_role").on(table.meetingTypeId, table.role),
]);

// =============================================================================
// MEETINGS TABLE
// =============================================================================

export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  meetingTypeId: integer("meeting_type_id").references(() => meetingTypes.id),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "restrict" }).notNull(),
  status: varchar("status", { length: 20 }).default("scheduled").notNull(), // 'scheduled', 'in_progress', 'completed', 'cancelled'
  location: varchar("location", { length: 255 }),
  isVirtual: boolean("is_virtual").default(false).notNull(),
  virtualLink: varchar("virtual_link", { length: 500 }),
  maxParticipants: integer("max_participants"),
  isRecorded: boolean("is_recorded").default(false).notNull(),
  recordingUrl: varchar("recording_url", { length: 500 }),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// =============================================================================
// MEETING PARTICIPANTS TABLE
// =============================================================================

export const meetingParticipants = pgTable("meeting_participants", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").references(() => meetings.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  status: varchar("status", { length: 20 }).default("invited").notNull(), // 'invited', 'present', 'absent', 'excused', 'proxy'
  proxyCompanyId: integer("proxy_company_id").references(() => companies.id), // Company this participant is representing (if proxy)
  joinedAt: timestamp("joined_at"),
  leftAt: timestamp("left_at"),
  invitedAt: timestamp("invited_at").defaultNow(),
  responseAt: timestamp("response_at"), // When they accepted/declined invitation
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("unique_meeting_participant").on(table.meetingId, table.userId),
]);

// =============================================================================
// AGENDA ITEMS TABLE
// =============================================================================

export const agendaItems = pgTable("agenda_items", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").references(() => meetings.id, { onDelete: "cascade" }).notNull(),
  parentId: integer("parent_id").references(() => agendaItems.id, { onDelete: "cascade" }), // For subsections
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  content: text("content"), // Rich text content for the agenda item
  duration: integer("duration").notNull(), // Duration in minutes
  type: varchar("type", { length: 50 }).notNull(), // 'procedural', 'presentation', 'discussion', 'vote', 'break'
  visualLink: varchar("visual_link", { length: 500 }), // Link to presentation, document, etc.
  orderIndex: integer("order_index").notNull(), // Order within the agenda
  status: varchar("status", { length: 50 }).default("pending").notNull(), // 'pending', 'in_progress', 'completed', 'skipped'
  isPrivate: boolean("is_private").default(false).notNull(), // Whether this item is visible to all participants
  attachments: jsonb("attachments").$type<{
    name: string;
    url: string;
    type: string;
    size?: number;
  }[]>(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  estimatedStartTime: timestamp("estimated_start_time"), // Calculated based on previous items
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_agenda_meeting_order").on(table.meetingId, table.orderIndex),
]);

// =============================================================================
// VOTES TABLE
// =============================================================================

export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  agendaItemId: integer("agenda_item_id").references(() => agendaItems.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 20 }).notNull(), // 'simple', 'multiple', 'ranked', 'approval'
  options: jsonb("options").notNull().$type<string[]>(), // Array of vote options
  isAnonymous: boolean("is_anonymous").default(false).notNull(),
  isOpen: boolean("is_open").default(true).notNull(),
  allowAbstention: boolean("allow_abstention").default(true).notNull(),
  requiresQuorum: boolean("requires_quorum").default(false).notNull(),
  quorumThreshold: integer("quorum_threshold"), // Percentage needed for quorum
  createdBy: integer("created_by").references(() => users.id, { onDelete: "restrict" }).notNull(),
  closedAt: timestamp("closed_at"),
  scheduledCloseAt: timestamp("scheduled_close_at"), // Auto-close time
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_votes_agenda_item").on(table.agendaItemId),
  index("idx_votes_open").on(table.isOpen),
]);

// =============================================================================
// VOTE RESPONSES TABLE
// =============================================================================

export const voteResponses = pgTable("vote_responses", {
  id: serial("id").primaryKey(),
  voteId: integer("vote_id").references(() => votes.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  option: varchar("option", { length: 255 }).notNull(), // The selected option
  votingForCompanyId: integer("voting_for_company_id").references(() => companies.id), // Company being represented (if proxy)
  castByUserId: integer("cast_by_user_id").references(() => users.id), // User who actually cast the vote (if delegation)
  weight: decimal("weight", { precision: 5, scale: 2 }).default("1.00"), // Vote weight (for weighted voting)
  comment: text("comment"), // Optional comment with the vote
  ipAddress: varchar("ip_address", { length: 45 }), // For audit trail
  userAgent: text("user_agent"), // For audit trail
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("unique_vote_user").on(table.voteId, table.userId),
  index("idx_vote_responses_vote").on(table.voteId),
]);

// =============================================================================
// RELATIONS
// =============================================================================

export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  meetingTypeAccess: many(meetingTypeAccess),
  proxyParticipants: many(meetingParticipants),
  voteResponsesAsProxy: many(voteResponses),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  createdMeetings: many(meetings),
  participations: many(meetingParticipants),
  createdVotes: many(votes),
  voteResponses: many(voteResponses),
  castVoteResponses: many(voteResponses, { relationName: "castByUser" }),
  meetingTypeAccess: many(meetingTypeAccess),
}));

export const meetingTypesRelations = relations(meetingTypes, ({ many }) => ({
  meetings: many(meetings),
  access: many(meetingTypeAccess),
  roles: many(meetingTypeRoles),
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
  meetingType: one(meetingTypes, {
    fields: [meetings.meetingTypeId],
    references: [meetingTypes.id],
  }),
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
  proxyCompany: one(companies, {
    fields: [meetingParticipants.proxyCompanyId],
    references: [companies.id],
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
    relationName: "parentChild",
  }),
  children: many(agendaItems, { relationName: "parentChild" }),
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
  votingForCompany: one(companies, {
    fields: [voteResponses.votingForCompanyId],
    references: [companies.id],
  }),
  castByUser: one(users, {
    fields: [voteResponses.castByUserId],
    references: [users.id],
    relationName: "castByUser",
  }),
}));

// =============================================================================
// TYPES EXPORTS
// =============================================================================

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type MeetingType = typeof meetingTypes.$inferSelect;
export type InsertMeetingType = typeof meetingTypes.$inferInsert;

export type MeetingTypeAccess = typeof meetingTypeAccess.$inferSelect;
export type InsertMeetingTypeAccess = typeof meetingTypeAccess.$inferInsert;

export type MeetingTypeRole = typeof meetingTypeRoles.$inferSelect;
export type InsertMeetingTypeRole = typeof meetingTypeRoles.$inferInsert;

export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = typeof meetings.$inferInsert;

export type MeetingParticipant = typeof meetingParticipants.$inferSelect;
export type InsertMeetingParticipant = typeof meetingParticipants.$inferInsert;

export type AgendaItem = typeof agendaItems.$inferSelect;
export type InsertAgendaItem = typeof agendaItems.$inferInsert;

export type Vote = typeof votes.$inferSelect;
export type InsertVote = typeof votes.$inferInsert;

export type VoteResponse = typeof voteResponses.$inferSelect;
export type InsertVoteResponse = typeof voteResponses.$inferInsert;

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

export const insertCompanySchema = createInsertSchema(companies, {
  email: z.string().email().optional(),
  siret: z.string().length(14).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.string().min(1),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
});

export const insertMeetingTypeSchema = createInsertSchema(meetingTypes, {
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMeetingTypeAccessSchema = createInsertSchema(meetingTypeAccess, {
  accessLevel: z.enum(["viewer", "participant", "moderator", "admin"]),
}).omit({
  id: true,
  createdAt: true,
});

export const insertMeetingTypeRoleSchema = createInsertSchema(meetingTypeRoles).omit({
  id: true,
  createdAt: true,
});

export const insertMeetingSchema = createInsertSchema(meetings, {
  title: z.string().min(1),
  date: z.string().or(z.date()).transform((val) => {
    return typeof val === 'string' ? new Date(val) : val;
  }),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
  endedAt: true,
});

export const insertMeetingParticipantSchema = createInsertSchema(meetingParticipants, {
  status: z.enum(["invited", "present", "absent", "excused", "proxy"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  joinedAt: true,
  leftAt: true,
  invitedAt: true,
  responseAt: true,
});

export const insertAgendaItemSchema = createInsertSchema(agendaItems, {
  title: z.string().min(1),
  duration: z.number().positive(),
  type: z.enum(["procedural", "presentation", "discussion", "vote", "break"]),
  orderIndex: z.number().min(0),
  status: z.enum(["pending", "in_progress", "completed", "skipped"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
  completedAt: true,
  estimatedStartTime: true,
});

export const insertVoteSchema = createInsertSchema(votes, {
  title: z.string().min(1),
  type: z.enum(["simple", "multiple", "ranked", "approval"]),
  options: z.array(z.string()).min(2),
  quorumThreshold: z.number().min(1).max(100).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  closedAt: true,
});

export const insertVoteResponseSchema = createInsertSchema(voteResponses, {
  option: z.string().min(1),
  weight: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
}).omit({
  id: true,
  createdAt: true,
  ipAddress: true,
  userAgent: true,
});

// =============================================================================
// ADDITIONAL VALIDATION SCHEMAS
// =============================================================================

// Schema for updating user profile
export const updateUserProfileSchema = insertUserSchema.partial().omit({
  password: true, // Password updates should be handled separately
});

// Schema for password update
export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

// Schema for meeting status updates
export const updateMeetingStatusSchema = z.object({
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
});

// Schema for participant status updates
export const updateParticipantStatusSchema = z.object({
  status: z.enum(["invited", "present", "absent", "excused", "proxy"]),
  proxyCompanyId: z.number().optional(),
});

// Schema for agenda item status updates
export const updateAgendaItemStatusSchema = z.object({
  status: z.enum(["pending", "in_progress", "completed", "skipped"]),
});

// Schema for vote closing
export const closeVoteSchema = z.object({
  closedAt: z.string().or(z.date()).transform((val) => {
    return typeof val === 'string' ? new Date(val) : val;
  }).optional(),
});

// Schema for magic link request
export const magicLinkRequestSchema = z.object({
  email: z.string().email(),
});

// Schema for login
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// =============================================================================
// UTILITY TYPES
// =============================================================================

// Enhanced types with relations
export type UserWithCompany = User & {
  company?: Company;
};

export type MeetingWithDetails = Meeting & {
  creator: User;
  meetingType?: MeetingType;
  participants?: MeetingParticipant[];
  agendaItems?: AgendaItem[];
};

export type AgendaItemWithVotes = AgendaItem & {
  votes?: Vote[];
  children?: AgendaItem[];
};

export type VoteWithResponses = Vote & {
  responses?: VoteResponse[];
  creator: User;
};

export type MeetingParticipantWithUser = MeetingParticipant & {
  user: User;
  proxyCompany?: Company;
};

export type VoteResponseWithUser = VoteResponse & {
  user?: User;
  votingForCompany?: Company;
  castByUser?: User;
};

// Permission types for type safety
export type UserPermission = keyof User['permissions'];

export type MeetingStatus = Meeting['status'];
export type ParticipantStatus = MeetingParticipant['status'];
export type AgendaItemStatus = AgendaItem['status'];
export type AgendaItemType = AgendaItem['type'];
export type VoteType = Vote['type'];
export type AccessLevel = MeetingTypeAccess['accessLevel'];

// =============================================================================
// CONSTANTS
// =============================================================================

export const MEETING_STATUSES = ["scheduled", "in_progress", "completed", "cancelled"] as const;
export const PARTICIPANT_STATUSES = ["invited", "present", "absent", "excused", "proxy"] as const;
export const AGENDA_ITEM_STATUSES = ["pending", "in_progress", "completed", "skipped"] as const;
export const AGENDA_ITEM_TYPES = ["procedural", "presentation", "discussion", "vote", "break"] as const;
export const VOTE_TYPES = ["simple", "multiple", "ranked", "approval"] as const;
export const ACCESS_LEVELS = ["viewer", "participant", "moderator", "admin"] as const;

// Default permissions by role
export const DEFAULT_PERMISSIONS = {
  "Salarié·es SCC": {
    canEdit: true,
    canManageAgenda: true,
    canManageUsers: true,
    canCreateMeetings: true,
    canExport: true,
    canVote: true,
    canSeeVoteResults: true,
    canManageParticipants: true,
  },
  "Conseil national": {
    canEdit: false,
    canManageAgenda: false,
    canManageUsers: false,
    canCreateMeetings: false,
    canExport: false,
    canVote: true,
    canSeeVoteResults: true,
    canManageParticipants: false,
  },
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getDefaultPermissions(role: string): User['permissions'] {
  return DEFAULT_PERMISSIONS[role as keyof typeof DEFAULT_PERMISSIONS] || DEFAULT_PERMISSIONS["Conseil national"];
}

export function isValidMeetingStatus(status: string): status is MeetingStatus {
  return MEETING_STATUSES.includes(status as MeetingStatus);
}

export function isValidParticipantStatus(status: string): status is ParticipantStatus {
  return PARTICIPANT_STATUSES.includes(status as ParticipantStatus);
}

export function isValidAgendaItemStatus(status: string): status is AgendaItemStatus {
  return AGENDA_ITEM_STATUSES.includes(status as AgendaItemStatus);
}

export function isValidAgendaItemType(type: string): type is AgendaItemType {
  return AGENDA_ITEM_TYPES.includes(type as AgendaItemType);
}

export function isValidVoteType(type: string): type is VoteType {
  return VOTE_TYPES.includes(type as VoteType);
}

export function isValidAccessLevel(level: string): level is AccessLevel {
  return ACCESS_LEVELS.includes(level as AccessLevel);
}

// Calculate estimated start time for agenda items
export function calculateEstimatedStartTime(
  agendaItems: AgendaItem[],
  currentItemIndex: number,
  meetingStartTime: Date
): Date {
  const precedingItems = agendaItems.slice(0, currentItemIndex);
  const totalDuration = precedingItems.reduce((sum, item) => sum + item.duration, 0);
  
  return new Date(meetingStartTime.getTime() + totalDuration * 60 * 1000);
}

// Validate vote option against available options
export function isValidVoteOption(option: string, availableOptions: string[]): boolean {
  return availableOptions.includes(option);
}

// Check if user has specific permission
export function hasPermission(user: User, permission: UserPermission): boolean {
  return user.permissions[permission] === true;
}

// Check if user can access meeting type
export function canAccessMeetingType(
  user: User,
  meetingType: MeetingType,
  access: MeetingTypeAccess[]
): boolean {
  // Check if user has direct access
  const userAccess = access.find(a => a.userId === user.id);
  if (userAccess) return true;
  
  // Check if user's company has access
  if (user.companyId) {
    const companyAccess = access.find(a => a.companyId === user.companyId);
    if (companyAccess) return true;
  }
  
  return false;
}

// Format user display name
export function formatUserName(user: User): string {
  return `${user.firstName} ${user.lastName}`;
}

// Format company display name with user
export function formatCompanyWithUser(company: Company, user: User): string {
  return `${company.name} (${formatUserName(user)})`;
}