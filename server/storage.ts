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
  meetingTypeRoles,
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
  type MeetingTypeRole,
  type InsertMeetingTypeRole,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql, inArray, or } from "drizzle-orm";

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
  getVote(id: number): Promise<Vote | undefined>;
  getVotesByAgendaItem(agendaItemId: number): Promise<Vote[]>;
  castVote(voteResponse: InsertVoteResponse): Promise<void>;
  getVoteResults(voteId: number): Promise<(VoteResponse & { user?: User })[]>;
  closeVote(voteId: number): Promise<void>;
  deleteVote(voteId: number): Promise<void>;
  getAgendaItem(id: number): Promise<AgendaItem | undefined>;
  
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
  
  // Meeting type role operations
  getMeetingTypeRoles(meetingTypeId: number): Promise<MeetingTypeRole[]>;
  createMeetingTypeRole(role: InsertMeetingTypeRole): Promise<MeetingTypeRole>;
  deleteMeetingTypeRole(id: number): Promise<void>;
  getMeetingTypesByRole(role: string): Promise<MeetingType[]>;
  
  // Get eligible users for a meeting type
  getEligibleUsersForMeeting(meetingTypeId: number): Promise<(User & { company?: Company })[]>;
}

export class DatabaseStorage implements IStorage {
  // Company operations
  async getCompanies(): Promise<Company[]> {
    try {
      return await db.select().from(companies).orderBy(asc(companies.name));
    } catch (error) {
      console.error("[Storage] Error getting companies:", error);
      throw error;
    }
  }

  async getCompany(id: number): Promise<Company | undefined> {
    try {
      const [company] = await db.select().from(companies).where(eq(companies.id, id));
      return company;
    } catch (error) {
      console.error("[Storage] Error getting company:", error);
      throw error;
    }
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    try {
      const [newCompany] = await db.insert(companies).values(company).returning();
      return newCompany;
    } catch (error) {
      console.error("[Storage] Error creating company:", error);
      throw error;
    }
  }

  async updateCompany(id: number, updates: Partial<Company>): Promise<Company> {
    try {
      const [updatedCompany] = await db
        .update(companies)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(companies.id, id))
        .returning();
      return updatedCompany;
    } catch (error) {
      console.error("[Storage] Error updating company:", error);
      throw error;
    }
  }

  async deleteCompany(id: number): Promise<void> {
    try {
      await db.delete(companies).where(eq(companies.id, id));
    } catch (error) {
      console.error("[Storage] Error deleting company:", error);
      throw error;
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("[Storage] Error getting user:", error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error("[Storage] Error getting user by email:", error);
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values(insertUser)
        .returning();
      return user;
    } catch (error) {
      console.error("[Storage] Error creating user:", error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await db.select().from(users).orderBy(asc(users.lastName), asc(users.firstName));
    } catch (error) {
      console.error("[Storage] Error getting all users:", error);
      throw error;
    }
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error("[Storage] Error updating user:", error);
      throw error;
    }
  }

  // Meeting operations
  async getMeeting(id: number): Promise<Meeting | undefined> {
    try {
      const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
      return meeting;
    } catch (error) {
      console.error("[Storage] Error getting meeting:", error);
      throw error;
    }
  }

  async getMeetingsByUser(userId: number): Promise<Meeting[]> {
    try {
      // Get meetings where user is creator
      const createdMeetings = await db
        .select()
        .from(meetings)
        .where(eq(meetings.createdBy, userId))
        .orderBy(desc(meetings.date));

      // Get meetings where user is participant
      const participatedMeetings = await db
        .select({
          id: meetings.id,
          title: meetings.title,
          description: meetings.description,
          date: meetings.date,
          meetingTypeId: meetings.meetingTypeId,
          createdBy: meetings.createdBy,
          status: meetings.status,
          location: meetings.location,
          isVirtual: meetings.isVirtual,
          virtualLink: meetings.virtualLink,
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
    } catch (error) {
      console.error("[Storage] Error getting meetings by user:", error);
      throw error;
    }
  }

  async createMeeting(meeting: InsertMeeting): Promise<Meeting> {
    try {
      const [newMeeting] = await db
        .insert(meetings)
        .values(meeting)
        .returning();
      return newMeeting;
    } catch (error) {
      console.error("[Storage] Error creating meeting:", error);
      throw error;
    }
  }

  async updateMeetingStatus(id: number, status: string): Promise<void> {
    try {
      await db
        .update(meetings)
        .set({ status, updatedAt: new Date() })
        .where(eq(meetings.id, id));
    } catch (error) {
      console.error("[Storage] Error updating meeting status:", error);
      throw error;
    }
  }

  // Meeting participants
  async addParticipant(meetingId: number, userId: number): Promise<void> {
    console.log(`[Storage] Adding participant: meetingId=${meetingId}, userId=${userId}`);
    try {
      await db
        .insert(meetingParticipants)
        .values({ meetingId, userId })
        .onConflictDoNothing();
      console.log(`[Storage] Participant added successfully`);
    } catch (error) {
      console.error(`[Storage] Error adding participant:`, error);
      throw error;
    }
  }

  async removeParticipant(meetingId: number, userId: number): Promise<void> {
    try {
      await db
        .delete(meetingParticipants)
        .where(
          and(
            eq(meetingParticipants.meetingId, meetingId),
            eq(meetingParticipants.userId, userId)
          )
        );
    } catch (error) {
      console.error("[Storage] Error removing participant:", error);
      throw error;
    }
  }

  async getMeetingParticipants(meetingId: number): Promise<(MeetingParticipant & { user: User, proxyCompany?: Company })[]> {
    try {
      const results = await db
        .select({
          // MeetingParticipant fields
          id: meetingParticipants.id,
          meetingId: meetingParticipants.meetingId,
          userId: meetingParticipants.userId,
          status: meetingParticipants.status,
          proxyCompanyId: meetingParticipants.proxyCompanyId,
          createdAt: meetingParticipants.createdAt,
          updatedAt: meetingParticipants.updatedAt,
          // User data
          user: {
            id: users.id,
            email: users.email,
            password: users.password,
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role,
            roles: users.roles,
            companyId: users.companyId,
            permissions: users.permissions,
            profileImageUrl: users.profileImageUrl,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          },
          // Proxy company data
          proxyCompany: {
            id: companies.id,
            name: companies.name,
            siret: companies.siret,
            address: companies.address,
            phone: companies.phone,
            email: companies.email,
            sector: companies.sector,
            description: companies.description,
            createdAt: companies.createdAt,
            updatedAt: companies.updatedAt,
          }
        })
        .from(meetingParticipants)
        .innerJoin(users, eq(meetingParticipants.userId, users.id))
        .leftJoin(companies, eq(meetingParticipants.proxyCompanyId, companies.id))
        .where(eq(meetingParticipants.meetingId, meetingId));

      return results.map(result => ({
        id: result.id,
        meetingId: result.meetingId,
        userId: result.userId,
        status: result.status,
        proxyCompanyId: result.proxyCompanyId,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        user: result.user,
        proxyCompany: result.proxyCompany.id ? result.proxyCompany : undefined,
      }));
    } catch (error) {
      console.error("[Storage] Error getting meeting participants:", error);
      throw error;
    }
  }

  async updateParticipantStatus(meetingId: number, userId: number, status: string, proxyCompanyId?: number): Promise<void> {
    console.log(`[Storage] Updating participant status: meetingId=${meetingId}, userId=${userId}, status=${status}, proxyCompanyId=${proxyCompanyId}`);
    try {
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
      console.log(`[Storage] Participant status updated successfully`);
    } catch (error) {
      console.error(`[Storage] Error updating participant status:`, error);
      throw error;
    }
  }

  // Agenda operations
  async getAgendaItems(meetingId: number): Promise<AgendaItem[]> {
    try {
      return await db
        .select()
        .from(agendaItems)
        .where(eq(agendaItems.meetingId, meetingId))
        .orderBy(asc(agendaItems.orderIndex));
    } catch (error) {
      console.error("[Storage] Error getting agenda items:", error);
      throw error;
    }
  }

  async createAgendaItem(item: InsertAgendaItem): Promise<AgendaItem> {
    try {
      const [newItem] = await db
        .insert(agendaItems)
        .values(item)
        .returning();
      return newItem;
    } catch (error) {
      console.error("[Storage] Error creating agenda item:", error);
      throw error;
    }
  }

  async updateAgendaItem(id: number, updates: Partial<AgendaItem>): Promise<AgendaItem> {
    try {
      const [updated] = await db
        .update(agendaItems)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(agendaItems.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error("[Storage] Error updating agenda item:", error);
      throw error;
    }
  }

  async deleteAgendaItem(id: number): Promise<void> {
    try {
      await db.delete(agendaItems).where(eq(agendaItems.id, id));
    } catch (error) {
      console.error("[Storage] Error deleting agenda item:", error);
      throw error;
    }
  }

  // Vote operations
  async createVote(vote: InsertVote): Promise<Vote> {
    try {
      const [newVote] = await db
        .insert(votes)
        .values(vote)
        .returning();
      return newVote;
    } catch (error) {
      console.error("[Storage] Error creating vote:", error);
      throw error;
    }
  }

  async getVote(id: number): Promise<Vote | undefined> {
    try {
      const [vote] = await db.select().from(votes).where(eq(votes.id, id));
      return vote;
    } catch (error) {
      console.error("[Storage] Error getting vote:", error);
      throw error;
    }
  }

  async getVotesByAgendaItem(agendaItemId: number): Promise<Vote[]> {
    try {
      return await db
        .select()
        .from(votes)
        .where(eq(votes.agendaItemId, agendaItemId))
        .orderBy(desc(votes.createdAt));
    } catch (error) {
      console.error("[Storage] Error getting votes by agenda item:", error);
      throw error;
    }
  }

  async castVote(voteResponse: InsertVoteResponse): Promise<void> {
    try {
      await db
        .insert(voteResponses)
        .values(voteResponse)
        .onConflictDoUpdate({
          target: [voteResponses.voteId, voteResponses.userId],
          set: {
            option: voteResponse.option,
            votingForCompanyId: voteResponse.votingForCompanyId,
            castByUserId: voteResponse.castByUserId,
          }
        });
    } catch (error) {
      console.error("[Storage] Error casting vote:", error);
      throw error;
    }
  }

  async getVoteResults(voteId: number): Promise<(VoteResponse & { user?: User })[]> {
    try {
      const results = await db
        .select({
          id: voteResponses.id,
          voteId: voteResponses.voteId,
          userId: voteResponses.userId,
          option: voteResponses.option,
          votingForCompanyId: voteResponses.votingForCompanyId,
          castByUserId: voteResponses.castByUserId,
          createdAt: voteResponses.createdAt,
          user: {
            id: users.id,
            email: users.email,
            password: users.password,
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role,
            roles: users.roles,
            companyId: users.companyId,
            permissions: users.permissions,
            profileImageUrl: users.profileImageUrl,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          }
        })
        .from(voteResponses)
        .leftJoin(users, eq(voteResponses.userId, users.id))
        .where(eq(voteResponses.voteId, voteId));

      return results.map(result => ({
        id: result.id,
        voteId: result.voteId,
        userId: result.userId,
        option: result.option,
        votingForCompanyId: result.votingForCompanyId,
        castByUserId: result.castByUserId,
        createdAt: result.createdAt,
        user: result.user.id ? result.user : undefined
      }));
    } catch (error) {
      console.error("[Storage] Error getting vote results:", error);
      throw error;
    }
  }

  async closeVote(voteId: number): Promise<void> {
    try {
      await db
        .update(votes)
        .set({ isOpen: false, closedAt: new Date() })
        .where(eq(votes.id, voteId));
    } catch (error) {
      console.error("[Storage] Error closing vote:", error);
      throw error;
    }
  }

  async deleteVote(voteId: number): Promise<void> {
    try {
      // Delete vote responses first (foreign key constraint)
      await db
        .delete(voteResponses)
        .where(eq(voteResponses.voteId, voteId));
      
      // Then delete the vote
      await db
        .delete(votes)
        .where(eq(votes.id, voteId));
    } catch (error) {
      console.error("[Storage] Error deleting vote:", error);
      throw error;
    }
  }

  async getAgendaItem(id: number): Promise<AgendaItem | undefined> {
    try {
      const [item] = await db.select().from(agendaItems).where(eq(agendaItems.id, id));
      return item;
    } catch (error) {
      console.error("[Storage] Error getting agenda item:", error);
      throw error;
    }
  }

  // Meeting type operations
  async getMeetingTypes(): Promise<MeetingType[]> {
    try {
      return await db
        .select()
        .from(meetingTypes)
        .where(eq(meetingTypes.isActive, true))
        .orderBy(asc(meetingTypes.name));
    } catch (error) {
      console.error("[Storage] Error getting meeting types:", error);
      throw error;
    }
  }

  async getMeetingType(id: number): Promise<MeetingType | undefined> {
    try {
      const [meetingType] = await db
        .select()
        .from(meetingTypes)
        .where(eq(meetingTypes.id, id));
      return meetingType;
    } catch (error) {
      console.error("[Storage] Error getting meeting type:", error);
      throw error;
    }
  }

  async createMeetingType(meetingType: InsertMeetingType): Promise<MeetingType> {
    try {
      const [created] = await db
        .insert(meetingTypes)
        .values(meetingType)
        .returning();
      return created;
    } catch (error) {
      console.error("[Storage] Error creating meeting type:", error);
      throw error;
    }
  }

  async updateMeetingType(id: number, updates: Partial<MeetingType>): Promise<MeetingType> {
    try {
      const [updated] = await db
        .update(meetingTypes)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(meetingTypes.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error("[Storage] Error updating meeting type:", error);
      throw error;
    }
  }

  async deleteMeetingType(id: number): Promise<void> {
    try {
      await db
        .update(meetingTypes)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(meetingTypes.id, id));
    } catch (error) {
      console.error("[Storage] Error deleting meeting type:", error);
      throw error;
    }
  }

  // Meeting type access operations
  async getMeetingTypeAccess(meetingTypeId: number): Promise<(MeetingTypeAccess & { user?: User, company?: Company })[]> {
    try {
      const results = await db
        .select({
          id: meetingTypeAccess.id,
          meetingTypeId: meetingTypeAccess.meetingTypeId,
          userId: meetingTypeAccess.userId,
          companyId: meetingTypeAccess.companyId,
          accessLevel: meetingTypeAccess.accessLevel,
          createdAt: meetingTypeAccess.createdAt,
          user: {
            id: users.id,
            email: users.email,
            password: users.password,
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role,
            roles: users.roles,
            companyId: users.companyId,
            permissions: users.permissions,
            profileImageUrl: users.profileImageUrl,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          },
          company: {
            id: companies.id,
            name: companies.name,
            siret: companies.siret,
            address: companies.address,
            phone: companies.phone,
            email: companies.email,
            sector: companies.sector,
            description: companies.description,
            createdAt: companies.createdAt,
            updatedAt: companies.updatedAt,
          },
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
        user: result.user.id ? result.user : undefined,
        company: result.company.id ? result.company : undefined,
      }));
    } catch (error) {
      console.error("[Storage] Error getting meeting type access:", error);
      throw error;
    }
  }

  async createMeetingTypeAccess(access: InsertMeetingTypeAccess): Promise<MeetingTypeAccess> {
    try {
      const [created] = await db
        .insert(meetingTypeAccess)
        .values(access)
        .onConflictDoNothing()
        .returning();
      return created;
    } catch (error) {
      console.error("[Storage] Error creating meeting type access:", error);
      throw error;
    }
  }

  async deleteMeetingTypeAccess(id: number): Promise<void> {
    try {
      await db
        .delete(meetingTypeAccess)
        .where(eq(meetingTypeAccess.id, id));
    } catch (error) {
      console.error("[Storage] Error deleting meeting type access:", error);
      throw error;
    }
  }

  async getUserAccessibleMeetingTypes(userId: number): Promise<MeetingType[]> {
    try {
      const user = await this.getUser(userId);
      if (!user) return [];

      const results = await db
        .select({
          id: meetingTypes.id,
          name: meetingTypes.name,
          description: meetingTypes.description,
          color: meetingTypes.color,
          isActive: meetingTypes.isActive,
          createdAt: meetingTypes.createdAt,
          updatedAt: meetingTypes.updatedAt,
        })
        .from(meetingTypeAccess)
        .innerJoin(meetingTypes, eq(meetingTypeAccess.meetingTypeId, meetingTypes.id))
        .where(
          and(
            eq(meetingTypes.isActive, true),
            user.companyId 
              ? or(
                  eq(meetingTypeAccess.userId, userId),
                  eq(meetingTypeAccess.companyId, user.companyId)
                )
              : eq(meetingTypeAccess.userId, userId)
          )
        )
        .groupBy(meetingTypes.id);

      return results;
    } catch (error) {
      console.error("[Storage] Error getting user accessible meeting types:", error);
      throw error;
    }
  }

  // Meeting type role operations
  async getMeetingTypeRoles(meetingTypeId: number): Promise<MeetingTypeRole[]> {
    try {
      return await db
        .select()
        .from(meetingTypeRoles)
        .where(eq(meetingTypeRoles.meetingTypeId, meetingTypeId));
    } catch (error) {
      console.error("[Storage] Error getting meeting type roles:", error);
      throw error;
    }
  }

  async createMeetingTypeRole(role: InsertMeetingTypeRole): Promise<MeetingTypeRole> {
    try {
      const [created] = await db
        .insert(meetingTypeRoles)
        .values(role)
        .returning();
      return created;
    } catch (error) {
      console.error("[Storage] Error creating meeting type role:", error);
      throw error;
    }
  }

  async deleteMeetingTypeRole(id: number): Promise<void> {
    try {
      await db
        .delete(meetingTypeRoles)
        .where(eq(meetingTypeRoles.id, id));
    } catch (error) {
      console.error("[Storage] Error deleting meeting type role:", error);
      throw error;
    }
  }

  async getMeetingTypesByRole(role: string): Promise<MeetingType[]> {
    try {
      const results = await db
        .select({
          id: meetingTypes.id,
          name: meetingTypes.name,
          description: meetingTypes.description,
          color: meetingTypes.color,
          isActive: meetingTypes.isActive,
          createdAt: meetingTypes.createdAt,
          updatedAt: meetingTypes.updatedAt,
        })
        .from(meetingTypeRoles)
        .innerJoin(meetingTypes, eq(meetingTypeRoles.meetingTypeId, meetingTypes.id))
        .where(
          and(
            eq(meetingTypeRoles.role, role),
            eq(meetingTypes.isActive, true)
          )
        );

      return results;
    } catch (error) {
      console.error("[Storage] Error getting meeting types by role:", error);
      throw error;
    }
  }

  // Get eligible users for a meeting type
  async getEligibleUsersForMeeting(meetingTypeId: number): Promise<(User & { company?: Company })[]> {
    try {
      const results = await db
        .select({
          id: users.id,
          email: users.email,
          password: users.password,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          roles: users.roles,
          companyId: users.companyId,
          permissions: users.permissions,
          profileImageUrl: users.profileImageUrl,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          company: {
            id: companies.id,
            name: companies.name,
            siret: companies.siret,
            address: companies.address,
            phone: companies.phone,
            email: companies.email,
            sector: companies.sector,
            description: companies.description,
            createdAt: companies.createdAt,
            updatedAt: companies.updatedAt,
          }
        })
        .from(meetingTypeAccess)
        .innerJoin(users, eq(meetingTypeAccess.userId, users.id))
        .leftJoin(companies, eq(users.companyId, companies.id))
        .where(eq(meetingTypeAccess.meetingTypeId, meetingTypeId));

      return results.map(result => ({
        ...result,
        company: result.company.id ? result.company : undefined,
      }));
    } catch (error) {
      console.error("[Storage] Error getting eligible users for meeting:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();