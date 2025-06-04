import {
  users,
  meetings,
  agendaItems,
  votes,
  voteResponses,
  meetingParticipants,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Meeting operations
  getMeeting(id: number): Promise<Meeting | undefined>;
  getMeetingsByUser(userId: number): Promise<Meeting[]>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeetingStatus(id: number, status: string): Promise<void>;
  
  // Meeting participants
  addParticipant(meetingId: number, userId: number): Promise<void>;
  removeParticipant(meetingId: number, userId: number): Promise<void>;
  getMeetingParticipants(meetingId: number): Promise<(MeetingParticipant & { user: User })[]>;
  updateParticipantPresence(meetingId: number, userId: number, isPresent: boolean): Promise<void>;
  
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
}

export class DatabaseStorage implements IStorage {
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

  async getMeetingParticipants(meetingId: number): Promise<(MeetingParticipant & { user: User })[]> {
    return await db
      .select({
        meetingId: meetingParticipants.meetingId,
        userId: meetingParticipants.userId,
        status: meetingParticipants.status,
        proxyToUserId: meetingParticipants.proxyToUserId,
        proxyToStructure: meetingParticipants.proxyToStructure,
        updatedAt: meetingParticipants.updatedAt,
        updatedBy: meetingParticipants.updatedBy,
        user: users
      })
      .from(meetingParticipants)
      .innerJoin(users, eq(meetingParticipants.userId, users.id))
      .where(eq(meetingParticipants.meetingId, meetingId));
  }

  async updateParticipantStatus(
    meetingId: number, 
    userId: number, 
    status: string,
    proxyToUserId?: number,
    proxyToStructure?: string,
    updatedBy?: number
  ): Promise<void> {
    await db
      .update(meetingParticipants)
      .set({ 
        status,
        proxyToUserId: proxyToUserId || null,
        proxyToStructure: proxyToStructure || null,
        updatedAt: new Date(),
        updatedBy: updatedBy || null
      })
      .where(
        and(
          eq(meetingParticipants.meetingId, meetingId),
          eq(meetingParticipants.userId, userId)
        )
      );
  }

  async getElectedMembers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.role, "Elu·es"));
  }

  async getStructures(): Promise<string[]> {
    const result = await db
      .selectDistinct({ structure: users.structure })
      .from(users)
      .where(and(
        eq(users.role, "Elu·es"),
        isNotNull(users.structure)
      ));
    
    return result.map(r => r.structure).filter(Boolean) as string[];
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
}

export const storage = new DatabaseStorage();
