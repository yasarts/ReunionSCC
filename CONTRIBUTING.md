# Guide de Contribution

## Structure du Code

### Frontend (client/)
- **Pages** : Composants de page principaux dans `src/pages/`
- **Composants** : Composants réutilisables dans `src/components/`
- **Hooks** : Logique métier réutilisable dans `src/hooks/`
- **Types** : Définitions TypeScript dans `src/types/`

### Backend (server/)
- **Routes** : API endpoints dans `routes.ts`
- **Storage** : Couche d'accès aux données dans `storage.ts`
- **Auth** : Système d'authentification dans `auth.ts`
- **Database** : Configuration Drizzle dans `db.ts`

### Partagé (shared/)
- **Schema** : Schémas de base de données et types dans `schema.ts`

## Conventions de Code

### TypeScript
- Utiliser des interfaces pour les types de données
- Typage strict activé
- Préférer les types explicites aux `any`

### React
- Composants fonctionnels avec hooks
- Props typées avec TypeScript
- État local avec useState, état global avec TanStack Query

### Base de Données
- Utiliser Drizzle ORM exclusivement
- Migrations via `npm run db:push`
- Relations explicites dans le schéma

## Flux de Développement

### Ajout de Fonctionnalités
1. Définir les types dans `shared/schema.ts`
2. Implémenter les méthodes de stockage dans `server/storage.ts`
3. Créer les routes API dans `server/routes.ts`
4. Développer l'interface utilisateur dans `client/`

### Tests
- Tester les API endpoints avec curl
- Valider l'interface utilisateur manuellement
- Vérifier la persistance des données

### WebSockets
- Utiliser pour les mises à jour temps réel
- Gérer les connexions dans `server/routes.ts`
- Écouter les événements côté client

## Sécurité

### Authentification
- Magic links via Brevo API
- Sessions sécurisées avec express-session
- Validation des permissions sur chaque route

### Données Sensibles
- Variables d'environnement pour les secrets
- Hashage bcrypt pour les mots de passe
- Validation des entrées utilisateur

## Performance

### Frontend
- TanStack Query pour la mise en cache
- Invalidation ciblée du cache
- Composants optimisés avec useMemo/useCallback

### Backend
- Requêtes SQL optimisées
- Index sur les colonnes fréquemment utilisées
- Pagination pour les grandes listes