# Application de Gestion de Réunions - Conseil National SCC

Une application web complète pour optimiser la gouvernance institutionnelle du Conseil National SCC, offrant des outils sophistiqués de gestion de réunions et d'interaction entre participants.

## Fonctionnalités Principales

### 🎯 Gestion de Réunions
- Interface de présentation dynamique avec navigation fluide
- Gestion hiérarchique de l'agenda avec sous-sections
- Timing configurable et suivi de progression
- Mode présentation optimisé pour vidéoconférence

### 👥 Gestion des Participants
- Système d'authentification sécurisé avec liens magiques
- Gestion des rôles et permissions
- Suivi de présence en temps réel
- Délégation de votes entre entreprises

### 🗳️ Système de Vote
- Votes interactifs avec résultats en temps réel
- Gestion sophistiquée des mandats et procurations
- Interface de vote basée sur les rôles
- Historique complet des votes

### 📝 Édition de Contenu
- Modification collaborative en temps réel
- Synchronisation WebSocket multi-utilisateurs
- Persistance automatique des modifications
- Support des liens de présentation

### 🏢 Gestion Organisationnelle
- Association utilisateurs-entreprises
- Hiérarchies organisationnelles
- Représentants par réunion
- Contrôle d'accès granulaire

## Technologies Utilisées

### Frontend
- **React.js** avec TypeScript
- **Tailwind CSS** pour le styling
- **Wouter** pour le routage
- **TanStack Query** pour la gestion d'état
- **shadcn/ui** pour les composants

### Backend
- **Express.js** avec TypeScript
- **PostgreSQL** avec Drizzle ORM
- **WebSocket** pour les mises à jour temps réel
- **Brevo API** pour l'envoi d'emails
- **bcrypt** pour la sécurisation

### Déploiement
- Configuration Replit optimisée
- Variables d'environnement sécurisées
- Base de données PostgreSQL

## Installation et Configuration

### Prérequis
- Node.js 20+
- PostgreSQL
- Compte Brevo pour l'envoi d'emails

### Variables d'Environnement
```env
DATABASE_URL=postgresql://...
BREVO_API_KEY=your_brevo_api_key
SESSION_SECRET=your_session_secret
```

### Installation
```bash
npm install
npm run db:push
npm run dev
```

## Structure du Projet

```
├── client/                 # Application React frontend
│   ├── src/
│   │   ├── components/     # Composants réutilisables
│   │   ├── pages/         # Pages de l'application
│   │   ├── hooks/         # Hooks React personnalisés
│   │   └── data/          # Données statiques
├── server/                # API Express backend
│   ├── routes.ts          # Routes API
│   ├── storage.ts         # Couche d'accès aux données
│   ├── auth.ts           # Authentification
│   └── db.ts             # Configuration base de données
├── shared/               # Types et schémas partagés
└── components.json       # Configuration shadcn/ui
```

## Fonctionnalités Avancées

### Authentification Magic Link
- Connexion sans mot de passe via email
- Tokens JWT sécurisés
- Sessions persistantes

### Synchronisation Temps Réel
- WebSocket pour les mises à jour collaboratives
- Invalidation automatique du cache
- Notifications en temps réel

### Système de Permissions
- Rôles granulaires (Président, Salarié·es, etc.)
- Contrôle d'accès par type de réunion
- Gestion des mandats de vote

## Licence

Ce projet est développé pour le Conseil National SCC.

## Support

Pour toute question ou assistance, contactez l'équipe de développement.