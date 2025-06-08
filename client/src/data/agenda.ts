export interface AgendaItem {
  id: string;
  title: string;
  duration: number;
  type: 'opening' | 'discussion' | 'decision' | 'information' | 'closing' | 'break';
  level: number;
  completed: boolean;
  notes?: string;
  presenter?: string;
  content?: string;
  visualLink?: string;
  isSubsection?: boolean;
  parentSectionId?: string;
  startTime?: string;
  tags?: string[];
  presentationLink?: string;
  presentationTitle?: string;
}

// TOUTES LES DONNÉES STATIQUES ONT ÉTÉ SUPPRIMÉES
// UTILISER UNIQUEMENT LA BASE DE DONNÉES PostgreSQL

// Export de fonction vide pour compatibilité temporaire
export function getMeetingData(meetingId: string) {
  return {
    meetingInfo: {
      title: "Utiliser base de données",
      date: new Date().toISOString().split('T')[0],
      time: "14:00",
      participants: [],
      pouvoir: ""
    },
    agendaItems: []
  };
}

export const agendaItems: AgendaItem[] = [];
export const meetingInfo = {
  title: "Utiliser base de données",
  date: new Date().toISOString().split('T')[0],
  time: "14:00",
  participants: [],
  pouvoir: ""
};