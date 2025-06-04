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

// Configuration des réunions par ID
export const meetingConfigs = {
  "conseil-national-2025": {
    title: "Conseil National SCC",
    date: "2025-06-05",
    time: "14:00",
    participants: [
      "Christine Nissim",
      "Valeria Vukadin", 
      "Pauline BARBOUX",
      "Sabrina SOW",
      "Alexandrine BIANCO"
    ],
    pouvoir: "POUVOIRS : Galapiat à la Volte."
  },
  "reunion-budget-2025": {
    title: "Réunion Budget 2025",
    date: "2025-06-08",
    time: "09:30",
    participants: [
      "Directeur Financier",
      "Responsable Comptabilité",
      "Chef de Projet"
    ],
    pouvoir: ""
  },
  "comite-direction-juin": {
    title: "Comité de Direction Juin",
    date: "2025-06-12",
    time: "15:00",
    participants: [
      "Directeur Général",
      "Directeur Opérationnel",
      "Directeur RH",
      "Directeur Commercial"
    ],
    pouvoir: ""
  },
  "formation-nouveaux-employes": {
    title: "Formation Nouveaux Employés",
    date: "2025-06-15",
    time: "10:00",
    participants: [
      "Responsable Formation",
      "Responsable RH",
      "Nouveaux employés"
    ],
    pouvoir: ""
  },
  "reunion-projet-tech": {
    title: "Réunion Projet Technologique",
    date: "2025-06-18",
    time: "14:30",
    participants: [
      "Chef de Projet Tech",
      "Développeur Senior",
      "Architecte Système"
    ],
    pouvoir: ""
  }
};

export const meetingInfo = meetingConfigs["conseil-national-2025"];

// Agendas spécifiques par réunion
export const agendaConfigs = {
  "conseil-national-2025": [
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
  ],
  "reunion-budget-2025": [
    {
      id: "budget-ouverture",
      title: "Ouverture de la séance",
      duration: 5,
      type: "opening",
      level: 0,
      completed: false,
      presenter: "Président",
      content: "Ouverture officielle de la réunion budget 2025"
    },
    {
      id: "budget-presentation",
      title: "Présentation du budget prévisionnel 2025",
      duration: 30,
      type: "discussion",
      level: 0,
      completed: false,
      presenter: "Directeur Financier",
      content: "Présentation détaillée du budget prévisionnel avec analyse des postes"
    },
    {
      id: "budget-analyse",
      title: "Analyse des dépenses par poste",
      duration: 25,
      type: "discussion",
      level: 0,
      completed: false,
      presenter: "Responsable Comptabilité",
      content: "Analyse détaillée des dépenses prévisionnelles par catégorie"
    },
    {
      id: "budget-vote",
      title: "Vote du budget 2025",
      duration: 15,
      type: "decision",
      level: 0,
      completed: false,
      presenter: "Président",
      content: "Vote officiel pour l'adoption du budget 2025"
    },
    {
      id: "budget-cloture",
      title: "Clôture de la séance",
      duration: 5,
      type: "closing",
      level: 0,
      completed: false,
      presenter: "Président",
      content: "Clôture officielle de la réunion"
    }
  ],
  "comite-direction-juin": [
    {
      id: "comite-ouverture",
      title: "Ouverture du Comité de Direction",
      duration: 5,
      type: "opening",
      level: 0,
      completed: false,
      presenter: "Directeur Général",
      content: "Ouverture de la réunion mensuelle du comité de direction"
    },
    {
      id: "comite-bilan",
      title: "Bilan d'activité du mois",
      duration: 20,
      type: "information",
      level: 0,
      completed: false,
      presenter: "Directeur Opérationnel",
      content: "Présentation des résultats du mois écoulé"
    },
    {
      id: "comite-rh",
      title: "Points RH et recrutements",
      duration: 15,
      type: "discussion",
      level: 0,
      completed: false,
      presenter: "Directeur RH",
      content: "État des recrutements en cours et questions RH"
    },
    {
      id: "comite-commercial",
      title: "Stratégie commerciale",
      duration: 25,
      type: "discussion",
      level: 0,
      completed: false,
      presenter: "Directeur Commercial",
      content: "Présentation de la stratégie commerciale et nouveaux contrats"
    },
    {
      id: "comite-decisions",
      title: "Décisions stratégiques",
      duration: 20,
      type: "decision",
      level: 0,
      completed: false,
      presenter: "Directeur Général",
      content: "Validation des orientations stratégiques"
    },
    {
      id: "comite-cloture",
      title: "Clôture",
      duration: 5,
      type: "closing",
      level: 0,
      completed: false,
      presenter: "Directeur Général",
      content: "Clôture du comité de direction"
    }
  ],
  "formation-nouveaux-employes": [
    {
      id: "formation-accueil",
      title: "Accueil des nouveaux employés",
      duration: 15,
      type: "opening",
      level: 0,
      completed: false,
      presenter: "Responsable RH",
      content: "Présentation de l'entreprise et accueil des nouveaux collaborateurs"
    },
    {
      id: "formation-procedures",
      title: "Présentation des procédures",
      duration: 60,
      type: "information",
      level: 0,
      completed: false,
      presenter: "Responsable Formation",
      content: "Formation aux procédures internes et outils de travail"
    },
    {
      id: "formation-securite",
      title: "Formation sécurité",
      duration: 45,
      type: "information",
      level: 0,
      completed: false,
      presenter: "Responsable Sécurité",
      content: "Formation aux consignes de sécurité et évacuation"
    },
    {
      id: "formation-questions",
      title: "Questions et réponses",
      duration: 30,
      type: "discussion",
      level: 0,
      completed: false,
      presenter: "Responsable Formation",
      content: "Session de questions-réponses avec les nouveaux employés"
    }
  ],
  "reunion-projet-tech": [
    {
      id: "tech-ouverture",
      title: "Ouverture de la réunion technique",
      duration: 5,
      type: "opening",
      level: 0,
      completed: false,
      presenter: "Chef de Projet Tech",
      content: "Ouverture de la réunion d'avancement technique"
    },
    {
      id: "tech-sprint-review",
      title: "Revue du sprint en cours",
      duration: 30,
      type: "information",
      level: 0,
      completed: false,
      presenter: "Développeur Senior",
      content: "Présentation des développements réalisés et blocages"
    },
    {
      id: "tech-architecture",
      title: "Évolutions architecturales",
      duration: 25,
      type: "discussion",
      level: 0,
      completed: false,
      presenter: "Architecte Système",
      content: "Discussion sur les évolutions architecturales proposées"
    },
    {
      id: "tech-planning",
      title: "Planification des prochaines itérations",
      duration: 20,
      type: "decision",
      level: 0,
      completed: false,
      presenter: "Chef de Projet Tech",
      content: "Validation du planning des prochains développements"
    },
    {
      id: "tech-roadmap",
      title: "Feuille de route technique",
      duration: 25,
      type: "discussion",
      level: 0,
      completed: false,
      presenter: "Architecte Système",
      content: "Présentation de la roadmap technique à moyen terme"
    },
    {
      id: "tech-risques",
      title: "Identification des risques",
      duration: 15,
      type: "discussion",
      level: 0,
      completed: false,
      presenter: "Chef de Projet Tech",
      content: "Analyse des risques techniques et mitigation"
    },
    {
      id: "tech-veille",
      title: "Veille technologique",
      duration: 10,
      type: "information",
      level: 0,
      completed: false,
      presenter: "Développeur Senior",
      content: "Présentation des nouvelles technologies et outils"
    },
    {
      id: "tech-formation",
      title: "Besoins en formation",
      duration: 10,
      type: "discussion",
      level: 0,
      completed: false,
      presenter: "Chef de Projet Tech",
      content: "Identification des besoins en formation de l'équipe"
    },
    {
      id: "tech-actions",
      title: "Plan d'actions",
      duration: 15,
      type: "decision",
      level: 0,
      completed: false,
      presenter: "Chef de Projet Tech",
      content: "Définition du plan d'actions pour les prochaines semaines"
    },
    {
      id: "tech-cloture",
      title: "Clôture",
      duration: 5,
      type: "closing",
      level: 0,
      completed: false,
      presenter: "Chef de Projet Tech",
      content: "Clôture de la réunion technique"
    }
  ]
};

// Fonction pour récupérer les données d'une réunion spécifique
export function getMeetingData(meetingId: string) {
  const config = meetingConfigs[meetingId as keyof typeof meetingConfigs];
  const agenda = agendaConfigs[meetingId as keyof typeof agendaConfigs];
  
  return {
    meetingInfo: config || meetingConfigs["conseil-national-2025"],
    agendaItems: agenda || agendaConfigs["conseil-national-2025"]
  };
}

// Exports par défaut pour compatibilité
export const agendaItems = agendaConfigs["conseil-national-2025"];