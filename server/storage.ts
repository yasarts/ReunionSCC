import {
  companies,
  users,
  meetings,
  agendaItems,
  votes,
  voteResponses,
  meetingParticipants,
  meetingTypes,
  meetingTypeAccess,
  type Company,
  type InsertCompany,
  type User,
  type InsertUser,
  type Meeting,
  type InsertMeeting,
  type AgendaItem,
  type InsertAgendaItem,
  type Vote,
  type InsertVote,
  type VoteResponse,
  type InsertVoteResponse,
  type MeetingParticipant,
  type MeetingType,
  type InsertMeetingType,
  type MeetingTypeAccess,
  type InsertMeetingTypeAccess,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";

export interface IStorage {
  // Company operations
  getCompanies(): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, updates: Partial<Company>): Promise<Company>;
  deleteCompany(id: number): Promise<void>;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  
  // Meeting operations
  getMeeting(id: number): Promise<Meeting | undefined>;
  getMeetingsByUser(userId: number): Promise<Meeting[]>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeetingStatus(id: number, status: string): Promise<void>;
  
  // Meeting participants
  addParticipant(meetingId: number, userId: number): Promise<void>;
  removeParticipant(meetingId: number, userId: number): Promise<void>;
  getMeetingParticipants(meetingId: number): Promise<(MeetingParticipant & { user: User, proxyCompany?: Company })[]>;
  updateParticipantStatus(meetingId: number, userId: number, status: string, proxyCompanyId?: number): Promise<void>;
  
  // Agenda operations
  getAgendaItems(meetingId: number): Promise<AgendaItem[]>;
  createAgendaItem(item: InsertAgendaItem): Promise<AgendaItem>;
  updateAgendaItem(id: number, updates: Partial<AgendaItem>): Promise<AgendaItem>;
  deleteAgendaItem(id: number): Promise<void>;
  
  // Vote operations
  createVote(vote: InsertVote): Promise<Vote>;
  getVotesByAgendaItem(agendaItemId: number): Promise<Vote[]>;
  castVote(voteResponse: InsertVoteResponse): Promise<void>;
  getVoteResults(voteId: number): Promise<VoteResponse[]>;
  closeVote(voteId: number): Promise<void>;
  
  // Meeting type operations
  getMeetingTypes(): Promise<MeetingType[]>;
  getMeetingType(id: number): Promise<MeetingType | undefined>;
  createMeetingType(meetingType: InsertMeetingType): Promise<MeetingType>;
  updateMeetingType(id: number, updates: Partial<MeetingType>): Promise<MeetingType>;
  deleteMeetingType(id: number): Promise<void>;
  
  // Meeting type access operations
  getMeetingTypeAccess(meetingTypeId: number): Promise<(MeetingTypeAccess & { user?: User, company?: Company })[]>;
  createMeetingTypeAccess(access: InsertMeetingTypeAccess): Promise<MeetingTypeAccess>;
  deleteMeetingTypeAccess(id: number): Promise<void>;
  getUserAccessibleMeetingTypes(userId: number): Promise<MeetingType[]>;
}

export class DatabaseStorage implements IStorage {
  // Company operations
  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies).orderBy(asc(companies.name));
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db.insert(companies).values(company).returning();
    return newCompany;
  }

  async updateCompany(id: number, updates: Partial<Company>): Promise<Company> {
    const [updatedCompany] = await db
      .update(companies)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning();
    return updatedCompany;
  }

  async deleteCompany(id: number): Promise<void> {
    await db.delete(companies).where(eq(companies.id, id));
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.lastName), asc(users.firstName));
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Meeting operations
  async getMeeting(id: number): Promise<Meeting | undefined> {
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
    return meeting;
  }

  async getMeetingsByUser(userId: number): Promise<Meeting[]> {
    // Get meetings where user is creator or participant
    const createdMeetings = await db
      .select()
      .from(meetings)
      .where(eq(meetings.createdBy, userId))
      .orderBy(desc(meetings.date));

    const participatedMeetings = await db
      .select({ 
        id: meetings.id,
        title: meetings.title,
        description: meetings.description,
        date: meetings.date,
        createdBy: meetings.createdBy,
        status: meetings.status,
        createdAt: meetings.createdAt,
        updatedAt: meetings.updatedAt
      })
      .from(meetings)
      .innerJoin(meetingParticipants, eq(meetings.id, meetingParticipants.meetingId))
      .where(eq(meetingParticipants.userId, userId))
      .orderBy(desc(meetings.date));

    // Combine and deduplicate
    const allMeetings = [...createdMeetings, ...participatedMeetings];
    const uniqueMeetings = allMeetings.filter((meeting, index, arr) => 
      arr.findIndex(m => m.id === meeting.id) === index
    );

    return uniqueMeetings;
  }

  async createMeeting(meeting: InsertMeeting): Promise<Meeting> {
    const [newMeeting] = await db
      .insert(meetings)
      .values(meeting)
      .returning();
    return newMeeting;
  }

  async updateMeetingStatus(id: number, status: string): Promise<void> {
    await db
      .update(meetings)
      .set({ status, updatedAt: new Date() })
      .where(eq(meetings.id, id));
  }

  // Meeting participants
  async addParticipant(meetingId: number, userId: number): Promise<void> {
    await db
      .insert(meetingParticipants)
      .values({ meetingId, userId })
      .onConflictDoNothing();
  }

  async removeParticipant(meetingId: number, userId: number): Promise<void> {
    await db
      .delete(meetingParticipants)
      .where(
        and(
          eq(meetingParticipants.meetingId, meetingId),
          eq(meetingParticipants.userId, userId)
        )
      );
  }

  async getMeetingParticipants(meetingId: number): Promise<(MeetingParticipant & { user: User, proxyCompany?: Company })[]> {
    const results = await db
      .select({
        meetingId: meetingParticipants.meetingId,
        userId: meetingParticipants.userId,
        status: meetingParticipants.status,
        proxyCompanyId: meetingParticipants.proxyCompanyId,
        joinedAt: meetingParticipants.joinedAt,
        createdAt: meetingParticipants.createdAt,
        updatedAt: meetingParticipants.updatedAt,
        user: users,
        proxyCompany: companies
      })
      .from(meetingParticipants)
      .innerJoin(users, eq(meetingParticipants.userId, users.id))
      .leftJoin(companies, eq(meetingParticipants.proxyCompanyId, companies.id))
      .where(eq(meetingParticipants.meetingId, meetingId));

    return results.map(result => ({
      ...result,
      proxyCompany: result.proxyCompany || undefined
    })) as (MeetingParticipant & { user: User, proxyCompany?: Company })[];
  }

  async updateParticipantStatus(meetingId: number, userId: number, status: string, proxyCompanyId?: number): Promise<void> {
    await db
      .update(meetingParticipants)
      .set({ 
        status,
        proxyCompanyId: proxyCompanyId || null,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(meetingParticipants.meetingId, meetingId),
          eq(meetingParticipants.userId, userId)
        )
      );
  }

  // Agenda operations
  async getAgendaItems(meetingId: number): Promise<AgendaItem[]> {
    return await db
      .select()
      .from(agendaItems)
      .where(eq(agendaItems.meetingId, meetingId))
      .orderBy(asc(agendaItems.orderIndex));
  }

  async createAgendaItem(item: InsertAgendaItem): Promise<AgendaItem> {
    const [newItem] = await db
      .insert(agendaItems)
      .values(item)
      .returning();
    return newItem;
  }

  async updateAgendaItem(id: number, updates: Partial<AgendaItem>): Promise<AgendaItem> {
    const [updated] = await db
      .update(agendaItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(agendaItems.id, id))
      .returning();
    return updated;
  }

  async deleteAgendaItem(id: number): Promise<void> {
    await db.delete(agendaItems).where(eq(agendaItems.id, id));
  }

  // Vote operations
  async createVote(vote: InsertVote): Promise<Vote> {
    const [newVote] = await db
      .insert(votes)
      .values(vote)
      .returning();
    return newVote;
  }

  async getVotesByAgendaItem(agendaItemId: number): Promise<Vote[]> {
    return await db
      .select()
      .from(votes)
      .where(eq(votes.agendaItemId, agendaItemId))
      .orderBy(desc(votes.createdAt));
  }

  async castVote(voteResponse: InsertVoteResponse): Promise<void> {
    await db
      .insert(voteResponses)
      .values(voteResponse)
      .onConflictDoUpdate({
        target: [voteResponses.voteId, voteResponses.userId],
        set: { 
          option: voteResponse.option,
          createdAt: new Date()
        }
      });
  }

  async getVoteResults(voteId: number): Promise<VoteResponse[]> {
    return await db
      .select()
      .from(voteResponses)
      .where(eq(voteResponses.voteId, voteId));
  }

  async closeVote(voteId: number): Promise<void> {
    await db
      .update(votes)
      .set({ isOpen: false, closedAt: new Date() })
      .where(eq(votes.id, voteId));
  }

  // Meeting type operations
  async getMeetingTypes(): Promise<MeetingType[]> {
    return await db
      .select()
      .from(meetingTypes)
      .where(eq(meetingTypes.isActive, true))
      .orderBy(asc(meetingTypes.name));
  }

  async getMeetingType(id: number): Promise<MeetingType | undefined> {
    const [meetingType] = await db
      .select()
      .from(meetingTypes)
      .where(eq(meetingTypes.id, id));
    return meetingType;
  }

  async createMeetingType(meetingType: InsertMeetingType): Promise<MeetingType> {
    const [created] = await db
      .insert(meetingTypes)
      .values(meetingType)
      .returning();
    return created;
  }

  async updateMeetingType(id: number, updates: Partial<MeetingType>): Promise<MeetingType> {
    const [updated] = await db
      .update(meetingTypes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(meetingTypes.id, id))
      .returning();
    return updated;
  }

  async deleteMeetingType(id: number): Promise<void> {
    await db
      .update(meetingTypes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(meetingTypes.id, id));
  }

  // Meeting type access operations
  async getMeetingTypeAccess(meetingTypeId: number): Promise<(MeetingTypeAccess & { user?: User, company?: Company })[]> {
    const results = await db
      .select({
        id: meetingTypeAccess.id,
        meetingTypeId: meetingTypeAccess.meetingTypeId,
        userId: meetingTypeAccess.userId,
        companyId: meetingTypeAccess.companyId,
        accessLevel: meetingTypeAccess.accessLevel,
        createdAt: meetingTypeAccess.createdAt,
        user: users,
        company: companies,
      })
      .from(meetingTypeAccess)
      .leftJoin(users, eq(meetingTypeAccess.userId, users.id))
      .leftJoin(companies, eq(meetingTypeAccess.companyId, companies.id))
      .where(eq(meetingTypeAccess.meetingTypeId, meetingTypeId));

    return results.map(result => ({
      id: result.id,
      meetingTypeId: result.meetingTypeId,
      userId: result.userId,
      companyId: result.companyId,
      accessLevel: result.accessLevel,
      createdAt: result.createdAt,
      user: result.user || undefined,
      company: result.company || undefined,
    }));
  }

  async createMeetingTypeAccess(access: InsertMeetingTypeAccess): Promise<MeetingTypeAccess> {
    const [created] = await db
      .insert(meetingTypeAccess)
      .values(access)
      .returning();
    return created;
  }

  async deleteMeetingTypeAccess(id: number): Promise<void> {
    await db
      .delete(meetingTypeAccess)
      .where(eq(meetingTypeAccess.id, id));
  }

  async getUserAccessibleMeetingTypes(userId: number): Promise<MeetingType[]> {
    const user = await this.getUser(userId);
    if (!user) return [];

    const accessibleTypes = await db
      .select({ meetingType: meetingTypes })
      .from(meetingTypeAccess)
      .innerJoin(meetingTypes, eq(meetingTypeAccess.meetingTypeId, meetingTypes.id))
      .where(
        and(
          eq(meetingTypes.isActive, true),
          user.companyId 
            ? eq(meetingTypeAccess.companyId, user.companyId)
            : eq(meetingTypeAccess.userId, userId)
        )
      );

    return accessibleTypes.map(result => result.meetingType);
  }
}

export const storage = new DatabaseStorage();
