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
  startTime?: string;
}

export const meetingInfo = {
  title: "Conseil National SCC",
  date: "2025-06-05",
  time: "10:00",
  participants: [
    "Christine Nissim",
    "Valeria Vukadin", 
    "Pauline BARBOUX",
    "Sabrina SOW",
    "Alexandrine BIANCO"
  ],
  pouvoir: "POUVOIRS : Galapiat à la Volte."
};

export const agendaItems: AgendaItem[] = [
  {
    id: "timeline",
    title: "Ordre du jour complet - Timeline de la réunion",
    duration: 5,
    type: "opening",
    level: 0,
    completed: false,
    presenter: "Secrétaire général",
    content: "Présentation de l'ordre du jour complet avec chronométrage prévisionnel",
    visualLink: ""
  },
  {
    id: "0",
    title: "0. AGE",
    duration: 5,
    type: "opening",
    level: 0,
    completed: false,
    presenter: "Président(e)",
    content: "Assemblée Générale Extraordinaire - Ouverture de la séance",
    visualLink: ""
  },
  {
    id: "1",
    title: "1. Piste Politiques publiques",
    duration: 45,
    type: "discussion",
    level: 0,
    completed: false,
    content: "Discussion sur les orientations stratégiques en matière de politiques publiques culturelles",
    visualLink: ""
  },
  {
    id: "1.1",
    title: "1.1 Retour rdv réunion filière",
    duration: 10,
    type: "information",
    level: 1,
    completed: false,
    content: "Compte-rendu de la réunion filière avec les institutions partenaires",
    visualLink: ""
  },
  {
    id: "1.2",
    title: "1.2 Politiques décentralisées - DRAC",
    duration: 10,
    type: "discussion",
    level: 1,
    completed: false,
    content: "Relations avec les Directions Régionales des Affaires Culturelles et politiques territoriales",
    visualLink: ""
  },
  {
    id: "1.3",
    title: "1.3. Municipales - Collaboration FFEC / SCC",
    duration: 15,
    type: "discussion",
    level: 1,
    completed: false,
    content: "Partenariat avec la Fédération Française des Écoles de Cirque dans le cadre des élections municipales",
    visualLink: ""
  },
  {
    id: "1.4",
    title: "1.4 Intersyndicale",
    duration: 10,
    type: "information",
    level: 1,
    completed: false,
    content: "Point sur les actions intersyndicales en cours",
    visualLink: ""
  },
  {
    id: "2",
    title: "2. Production",
    duration: 30,
    type: "discussion",
    level: 0,
    completed: false
  },
  {
    id: "2.1",
    title: "2.1. Interpellation Syndeac / Charte TDC / Production/ Résidence",
    duration: 30,
    type: "discussion",
    level: 1,
    completed: false,
    content: "Discussion sur l'interpellation du Syndeac concernant la charte TDC et les questions de production et résidence",
    visualLink: ""
  },
  {
    id: "3",
    title: "3. FSICPA - Point d'information",
    duration: 60,
    type: "information",
    level: 0,
    completed: false
  },
  {
    id: "3.1",
    title: "3.1 Changements de gouvernance au sein du SYNAVI",
    duration: 10,
    type: "information",
    level: 1,
    completed: false,
    content: "Présentation des modifications de gouvernance au sein du SYNAVI",
    visualLink: ""
  },
  {
    id: "3.2",
    title: "Décision concernant l'intérim de la vice-présidence de la CPPNI",
    duration: 15,
    type: "decision",
    level: 1,
    completed: false
  },
  {
    id: "3.3",
    title: "Représentation au CNPS (Conseil National des Professions du Spectacle)",
    duration: 20,
    type: "discussion",
    level: 1,
    completed: false
  },
  {
    id: "3.3.1",
    title: "Bureau du CNPS",
    duration: 10,
    type: "information",
    level: 2,
    completed: false
  },
  {
    id: "3.3.2",
    title: "Stratégie vis-à-vis du SMA (Syndicat des Musiques Actuelles)",
    duration: 10,
    type: "discussion",
    level: 2,
    completed: false
  },
  {
    id: "3.4",
    title: "Coordination FSICPA",
    duration: 15,
    type: "information",
    level: 1,
    completed: false
  },
  {
    id: "4",
    title: "4. Point Formation professionnelle",
    duration: 45,
    type: "discussion",
    level: 0,
    completed: false
  },
  {
    id: "4.1",
    title: "4.1 AFDAS",
    duration: 15,
    type: "information",
    level: 1,
    completed: false
  },
  {
    id: "4.2",
    title: "4.2 Écoles",
    duration: 15,
    type: "discussion",
    level: 1,
    completed: false
  },
  {
    id: "4.3",
    title: "4.3 CNPS",
    duration: 15,
    type: "information",
    level: 1,
    completed: false
  },
  {
    id: "5",
    title: "5. Régions",
    duration: 45,
    type: "discussion",
    level: 0,
    completed: false
  },
  {
    id: "5.1",
    title: "5.1. SODAC",
    duration: 15,
    type: "information",
    level: 1,
    completed: false
  },
  {
    id: "5.2",
    title: "5.2. Intervention compagnies nantaises",
    duration: 15,
    type: "discussion",
    level: 1,
    completed: false
  },
  {
    id: "5.3",
    title: "5.3 COREPS",
    duration: 15,
    type: "information",
    level: 1,
    completed: false
  },
  {
    id: "6",
    title: "6. Conventions collectives",
    duration: 60,
    type: "discussion",
    level: 0,
    completed: false
  },
  {
    id: "6.1",
    title: "6.1. Point étape CCNEAC - Classification",
    duration: 20,
    type: "discussion",
    level: 1,
    completed: false
  },
  {
    id: "6.2",
    title: "6.2. Point d'étape CCNSVP - FCAP",
    duration: 20,
    type: "discussion",
    level: 1,
    completed: false
  },
  {
    id: "6.3",
    title: "6.3. FNAS / CASC : modifications",
    duration: 20,
    type: "decision",
    level: 1,
    completed: false
  },
  {
    id: "7",
    title: "7. Divers",
    duration: 15,
    type: "discussion",
    level: 0,
    completed: false
  },
  {
    id: "7.1",
    title: "7.1. Validation d'un texte sur les règles de conciliation réalisée par le SCC",
    duration: 15,
    type: "decision",
    level: 1,
    completed: false
  }
];