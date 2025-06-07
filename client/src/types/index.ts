// Re-export des types du schéma partagé pour faciliter les imports
export type {
  User,
  Company,
  Meeting,
  AgendaItem,
  Vote,
  VoteResponse,
  MeetingParticipant,
  MeetingType,
  MeetingTypeAccess,
  MeetingTypeRole,
  InsertUser,
  InsertCompany,
  InsertMeeting,
  InsertAgendaItem,
  InsertVote,
  InsertVoteResponse,
  InsertMeetingParticipant,
  InsertMeetingType,
  InsertMeetingTypeAccess,
  InsertMeetingTypeRole,
} from '@shared/schema';

// Types spécifiques au client
export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

// Types pour les composants de vote
export interface VoteOption {
  value: string;
  label: string;
}

export interface VoteResults {
  option: string;
  count: number;
  percentage: number;
}

// Types pour les participants
export interface ParticipantWithUser extends MeetingParticipant {
  user: User;
  proxyCompany?: Company;
}

// Types pour l'authentification - réexport du hook
export type { User as AuthUser } from '@/hooks/useAuth';