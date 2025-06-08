export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: {
    canView: boolean;
    canEdit: boolean;
    canManageAgenda: boolean;
    canManageParticipants: boolean;
    canCreateMeetings: boolean;
    canManageUsers: boolean;
    canVote: boolean;
    canSeeVoteResults: boolean;
  };
  profileImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Meeting {
  id: number;
  title: string;
  description?: string;
  date: string;
  createdBy: number;
  status: 'draft' | 'scheduled' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
  agendaItems?: AgendaItem[];
  participants?: MeetingParticipant[];
}

export interface AgendaItem {
  id: number;
  meetingId: number;
  parentId?: number;
  title: string;
  description?: string;
  content?: string;
  duration: number;
  type: 'procedural' | 'presentation' | 'discussion';
  visualLink?: string;
  orderIndex: number;
  status: 'pending' | 'in_progress' | 'completed';
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vote {
  id: number;
  agendaItemId: number;
  question: string;
  options: string[];
  isOpen: boolean;
  createdBy: number;
  createdAt: string;
  closedAt?: string;
}

export interface VoteResponse {
  voteId: number;
  userId: number;
  option: string;
  createdAt: string;
}

export interface MeetingParticipant {
  meetingId: number;
  userId: number;
  isPresent: boolean;
  joinedAt?: string;
  user: User;
}
