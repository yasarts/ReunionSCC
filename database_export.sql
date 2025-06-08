-- Export complet de la base de données SCC Meeting Manager
-- Généré le : 2025-06-07

-- ===============================================
-- EXPORT DES DONNÉES
-- ===============================================

-- Début de l'export
BEGIN;

-- Désactiver les contraintes temporairement
SET session_replication_role = replica;

-- ===============================================
-- TABLE: companies
-- ===============================================
INSERT INTO companies (id, name, siret, address, phone, email, sector, description, created_at, updated_at) VALUES
(1, 'Société Coopérative de Construction SCC', '12345678901234', '123 Avenue de la République, 75001 Paris', '01.23.45.67.89', 'contact@scc.fr', 'Construction et BTP', 'Société coopérative spécialisée dans la construction durable et l''habitat social', '2025-06-04 01:13:47.174939', '2025-06-04 01:13:47.174939'),
(2, 'Entreprise Partenaire Alpha', '98765432109876', '456 Rue de l''Innovation, 69001 Lyon', '04.56.78.90.12', 'contact@alpha.fr', 'Services numériques', 'Société de conseil en transformation digitale', '2025-06-04 01:13:47.174939', '2025-06-04 01:13:47.174939'),
(3, 'Coopérative Beta', '11223344556677', '789 Chemin des Champs, 31000 Toulouse', '05.67.89.01.23', 'info@beta-coop.fr', 'Agriculture bio', 'Coopérative agricole spécialisée dans le bio et les circuits courts', '2025-06-04 01:13:47.174939', '2025-06-04 01:13:47.174939'),
(5, 'test', NULL, NULL, NULL, NULL, NULL, NULL, '2025-06-04 12:48:29.014196', '2025-06-04 12:48:29.014196');

-- ===============================================
-- TABLE: users
-- ===============================================
INSERT INTO users (id, email, password, first_name, last_name, role, permissions, profile_image_url, created_at, updated_at, company_id, roles) VALUES
(1, 'admin@scc-cirque.org', '$2b$10$UG.VcPxYF.btt7PgiLHwtu2KP77vFIU3Aa0WxFUUr7I6ePl4wWVt6', 'Admin', 'SCC', 'Salarié·es SCC', '{"canEdit": true, "canView": true, "canVote": true, "canManageUsers": true, "canManageAgenda": true, "canCreateMeetings": true, "canSeeVoteResults": true, "canManageParticipants": true}', NULL, '2025-06-03 22:17:56.58205', '2025-06-04 13:37:06.596', NULL, NULL),
(2, 'christine.nissim@scc-cirque.org', '$2b$10$ZImd.Qe3TBmVMXL2kAg2nOhNs9BqQNHmFF.gRyYiTzs9s4uz0DLq6', 'Christine', 'Nissim', 'Elu·es', '{"canEdit": false, "canView": true, "canVote": true, "canManageUsers": false, "canManageAgenda": false, "canCreateMeetings": false, "canSeeVoteResults": true, "canManageParticipants": false}', NULL, '2025-06-03 22:17:56.688535', '2025-06-04 13:26:18.951', 3, NULL),
(3, 'salarie@scc.fr', '$2b$10$ik.k8oDZVg/CYI0MJdWzm.uKnvX0s5KsIu5xnRAocEoBg9oHr64ZO', 'Salarié', 'Test', 'Salarié·es SCC', '{"canEdit": true, "canView": true, "canVote": true, "canManageUsers": true, "canManageAgenda": true, "canCreateMeetings": true, "canSeeVoteResults": true, "canManageParticipants": true}', NULL, '2025-06-04 01:21:25.219045', '2025-06-04 01:21:25.219045', 1, NULL),
(4, 'elu@scc.fr', '$2b$10$ik.k8oDZVg/CYI0MJdWzm.uKnvX0s5KsIu5xnRAocEoBg9oHr64ZO', 'Élu', 'Test', 'council_member', '{"canEdit": false, "canView": true, "canVote": true, "canManageUsers": false, "canManageAgenda": false, "canCreateMeetings": false, "canSeeVoteResults": true, "canManageParticipants": false}', NULL, '2025-06-04 01:21:25.219045', '2025-06-04 01:21:25.219045', 2, NULL),
(5, 'yannis.jean@gmail.com', '$2b$10$Jf1Q8Sszq1ROPphn2mvw6OVoH6W6tUfvH48ONDNYUr/vMamLUMiwu', 'Yannis', 'JEAN', 'Elu·es', '{"canEdit": false, "canView": true, "canVote": true, "canManageUsers": false, "canManageAgenda": false, "canCreateMeetings": false, "canSeeVoteResults": true, "canManageParticipants": false}', NULL, '2025-06-06 20:58:47.359189', '2025-06-06 20:58:47.359189', 3, NULL),
(6, 'yannis.jean@compagnies.org', '$2b$10$gah67dczR6CkwCDYbTauz.OOGBDim7P/TKIIiQRFCJMYCAa7XPsmW', 'Yannis', 'Jean', 'Salarié·es SCC', '{"canEdit": false, "canView": true, "canVote": true, "canManageUsers": false, "canManageAgenda": false, "canCreateMeetings": false, "canSeeVoteResults": true, "canManageParticipants": false}', NULL, '2025-06-07 00:06:51.994986', '2025-06-07 00:06:51.994986', NULL, NULL);

-- ===============================================
-- TABLE: meeting_types
-- ===============================================
INSERT INTO meeting_types (id, name, description, color, is_active, created_at, updated_at) VALUES
(1, 'Conseil National', 'Conseils nationaux du SCC', '#054b6b', true, '2025-06-04 13:20:34.515288', '2025-06-06 12:11:02.323'),
(2, 'Bureau SCC', NULL, '#9ac9df', true, '2025-06-06 12:11:29.641681', '2025-06-06 12:11:43.137'),
(3, 'Réunion Equipe', NULL, '#53fb50', true, '2025-06-06 12:12:56.121024', '2025-06-06 12:12:56.121024');

-- ===============================================
-- TABLE: meetings
-- ===============================================
INSERT INTO meetings (id, title, description, date, created_by, status, created_at, updated_at, meeting_type_id) VALUES
(1, 'CN - 05-06-2025', 'Test 1', '2025-06-05 08:00:00', 1, 'draft', '2025-06-03 22:41:19.116044', '2025-06-03 22:41:19.116044', NULL);

-- ===============================================
-- TABLE: agenda_items
-- ===============================================
INSERT INTO agenda_items (id, meeting_id, parent_id, title, description, content, duration, type, visual_link, order_index, status, started_at, completed_at, created_at, updated_at) VALUES
(1, 1, NULL, 'Ouverture de séance', 'Accueil et vérification du quorum', 'éunion filière du 28 mai : 
La réunion de la filière cirque du 28 mai, consacrée à la méthodologie de travail entre le secteur et le Ministère de la Culture, a été jugée décevante. 
L''ordre du jour prévoyait de définir des thématiques de travail et de désigner des chefs de file parmi les organisations membres (SCC, Territoires de Cirque, FFEC, etc.) afin de rendre ces réunions plus efficaces. Cette démarche faisait suite à un entretien préliminaire en avril avec la déléguée théâtre du ministère (accompagnée de son équipe) pour rappeler l''importance d''une démarche collaborative plutôt que descendante.
Malgré ces intentions, la réunion du 28 mai s''est déroulée dans un climat difficile. La représentante du ministère a monopolisé la parole, exposant sa vision d''un « parcours de l''usager » allant de l''initiation en école de cirque jusqu''à la vie professionnelle, sans réellement écouter les contributions du terrain. Elle a notamment relativisé les difficultés actuelles du secteur en les qualifiant de « contraction temporaire », suggérant d''attendre que la crise passe. Les tentatives des organisations présentes pour aborder le fond des problèmes (soutien à la production, à la diffusion, formation professionnelle, etc.) ont été systématiquement interrompues, créant un dialogue de sourds. Aucune discussion de fond n''a pu avoir lieu sur la répartition des moyens ou l''évolution des politiques, ces sujets étant éludés en raison de divergences latentes.
Seul point concret, face à la proposition ministérielle d''échelonner les travaux par thèmes sur deux ans (formation fin 2025, entraînement début 2026, production mi-2026), l''ensemble des participants ont exprimé leur désaccord. 
Ils ont obtenu le principe de mettre en place plusieurs groupes de travail en parallèle sur l''ensemble des sujets prioritaires (formation, entraînement des artistes, production, diffusion), afin de ne pas retarder le traitement de certaines urgences. Il a également été réaffirmé que l''animation de ces groupes devra être copilotée par les organisations professionnelles (notamment SCC et Territoires de Cirque) plutôt que laissée à un seul acteur.
Le CN note positivement que cette fois toutes les parties prenantes de la filière (syndicats d''artistes, représentants des écoles, structures de diffusion, etc.) ont partagé le même constat d''inefficacité de la réunion. L''attitude de la déléguée théâtre a soudé le secteur dans la prise de conscience d''un dysfonctionnement, alors qu''auparavant le SCC se retrouvait isolé face à elle. Néanmoins, l''absence d''écoute de l''administration demeure préoccupante.', 5, 'procedural', NULL, 0, 'pending', NULL, NULL, '2025-06-03 22:41:19.158454', '2025-06-06 23:39:30.886'),
(1849, 1, NULL, 'Section 2', 'Agenda item for section 2', NULL, 10, 'discussion', NULL, 200, 'pending', NULL, NULL, '2025-06-06 22:17:07.006232', '2025-06-06 22:17:07.006232'),
(1851, 1, NULL, 'Section 3', 'Agenda item for section 3', NULL, 10, 'discussion', NULL, 300, 'pending', NULL, NULL, '2025-06-06 22:17:07.006232', '2025-06-06 22:17:07.006232'),
(9564, 1, NULL, 'Section 1.1', 'Agenda item for section 1.1', 'Réunion filière du 28 mai : 
La réunion de la filière cirque du 28 mai, consacrée à la méthodologie de travail entre le secteur et le Ministère de la Culture, a été jugée décevante. 
L''ordre du jour prévoyait de définir des thématiques de travail et de désigner des chefs de file parmi les organisations membres (SCC, Territoires de Cirque, FFEC, etc.) afin de rendre ces réunions plus efficaces. Cette démarche faisait suite à un entretien préliminaire en avril avec la déléguée théâtre du ministère (accompagnée de son équipe) pour rappeler l''importance d''une démarche collaborative plutôt que descendante.
Malgré ces intentions, la réunion du 28 mai s''est déroulée dans un climat difficile. La représentante du ministère a monopolisé la parole, exposant sa vision d''un « parcours de l''usager » allant de l''initiation en école de cirque jusqu''à la vie professionnelle, sans réellement écouter les contributions du terrain. Elle a notamment relativisé les difficultés actuelles du secteur en les qualifiant de « contraction temporaire », suggérant d''attendre que la crise passe. Les tentatives des organisations présentes pour aborder le fond des problèmes (soutien à la production, à la diffusion, formation professionnelle, etc.) ont été systématiquement interrompues, créant un dialogue de sourds. Aucune discussion de fond n''a pu avoir lieu sur la répartition des moyens ou l''évolution des politiques, ces sujets étant éludés en raison de divergences latentes.
Seul point concret, face à la proposition ministérielle d''échelonner les travaux par thèmes sur deux ans (formation fin 2025, entraînement début 2026, production mi-2026), l''ensemble des participants ont exprimé leur désaccord. 
Ils ont obtenu le principe de mettre en place plusieurs groupes de travail en parallèle sur l''ensemble des sujets prioritaires (formation, entraînement des artistes, production, diffusion), afin de ne pas retarder le traitement de certaines urgences. Il a également été réaffirmé que l''animation de ces groupes devra être copilotée par les organisations professionnelles (notamment SCC et Territoires de Cirque) plutôt que laissée à un seul acteur.
Le CN note positivement que cette fois toutes les parties prenantes de la filière (syndicats d''artistes, représentants des écoles, structures de diffusion, etc.) ont partagé le même constat d''inefficacité de la réunion. L''attitude de la déléguée théâtre a soudé le secteur dans la prise de conscience d''un dysfonctionnement, alors qu''auparavant le SCC se retrouvait isolé face à elle. Néanmoins, l''absence d''écoute de l''administration demeure préoccupante.', 10, 'discussion', NULL, 100, 'pending', NULL, NULL, '2025-06-06 22:15:42.028233', '2025-06-07 00:08:25.014'),
(9565, 1, NULL, 'Section 1.2', 'Agenda item for section 1.2', NULL, 10, 'discussion', NULL, 101, 'pending', NULL, NULL, '2025-06-06 22:15:42.028233', '2025-06-06 22:15:42.028233'),
(9566, 1, NULL, 'Section 1.3', 'Agenda item for section 1.3', NULL, 10, 'discussion', NULL, 102, 'pending', NULL, NULL, '2025-06-06 22:15:42.028233', '2025-06-06 22:15:42.028233'),
(9567, 1, NULL, 'Section 1.4', 'Agenda item for section 1.4', NULL, 10, 'discussion', NULL, 103, 'pending', NULL, NULL, '2025-06-06 22:15:42.028233', '2025-06-06 22:15:42.028233'),
(9616, 1, NULL, 'Section 2.1', 'Agenda item for section 2.1', NULL, 10, 'discussion', NULL, 201, 'pending', NULL, NULL, '2025-06-06 22:17:07.006232', '2025-06-06 22:17:07.006232'),
(9618, 1, NULL, 'Section 3.1', 'Agenda item for section 3.1', NULL, 10, 'discussion', NULL, 301, 'pending', NULL, NULL, '2025-06-06 22:17:07.006232', '2025-06-06 22:17:07.006232');

-- ===============================================
-- TABLE: votes
-- ===============================================
INSERT INTO votes (id, agenda_item_id, question, options, is_open, created_by, created_at, closed_at) VALUES
(10, 9565, 'Vote spécifique à la section 1.2', '["Oui", "Non", "Abstention"]', false, 1, '2025-06-06 22:16:18.201824', '2025-06-06 23:22:51.345'),
(11, 1, 'Tst', '["Pour", "Contre", "Abstention"]', true, 1, '2025-06-06 22:24:11.664912', NULL),
(12, 1, 'Test 1', '["Pour", "Contre", "Abstention"]', true, 1, '2025-06-06 22:33:24.538249', NULL),
(14, 9564, 'test encore', '["Pour", "Contre", "Abstention"]', false, 1, '2025-06-06 22:39:51.379923', '2025-06-06 23:21:50.338'),
(16, 9564, 'Troisième vote', '["Pour", "Contre", "Abstention"]', false, 1, '2025-06-06 23:23:37.278537', '2025-06-06 23:28:43.627'),
(17, 9564, 'Un 4ème vote', '["Pour", "Contre", "Abstention"]', true, 1, '2025-06-06 23:29:07.029429', NULL),
(18, 9564, 'Un 5ème vote', '["Pour", "Contre", "Abstention"]', true, 1, '2025-06-06 23:33:00.043405', NULL);

-- ===============================================
-- TABLE: vote_responses
-- ===============================================
INSERT INTO vote_responses (id, vote_id, user_id, option, created_at, voting_for_company_id, cast_by_user_id) VALUES
(3, 14, 3, 'Pour', '2025-06-06 23:21:44.369275', 1, 1),
(4, 14, 3, 'Abstention', '2025-06-06 23:21:50.225578', 3, 1),
(5, 10, 3, 'Oui', '2025-06-06 23:22:47.317484', 1, 1),
(6, 10, 3, 'Oui', '2025-06-06 23:22:51.235356', 3, 1),
(7, 16, 3, 'Pour', '2025-06-06 23:28:40.420434', 1, 1),
(8, 16, 3, 'Pour', '2025-06-06 23:28:43.516938', 3, 1);

-- ===============================================
-- TABLE: meeting_participants
-- ===============================================
INSERT INTO meeting_participants (meeting_id, user_id, status, proxy_company_id, created_at, updated_at, joined_at) VALUES
(1, 2, 'present', NULL, '2025-06-06 15:40:05.458368', '2025-06-06 15:40:05.485', NULL),
(1, 3, 'proxy', 3, '2025-06-06 15:59:56.597304', '2025-06-06 15:59:56.608', NULL);

-- ===============================================
-- TABLE: meeting_type_access
-- ===============================================
INSERT INTO meeting_type_access (id, meeting_type_id, user_id, company_id, access_level, created_at) VALUES
(1, 1, 2, NULL, 'read', '2025-06-04 13:25:58.551692'),
(2, 1, 1, NULL, 'read', '2025-06-04 13:26:05.167071');

-- ===============================================
-- TABLE: meeting_type_roles
-- ===============================================
INSERT INTO meeting_type_roles (id, meeting_type_id, role, created_at) VALUES
(1, 1, 'Salarié·es SCC', '2025-06-04 14:06:08.526411'),
(13, 1, 'Elu·es', '2025-06-06 12:11:01.151963'),
(14, 2, 'Salarié·es SCC', '2025-06-06 12:11:41.149764'),
(15, 2, 'Elu·es', '2025-06-06 12:11:42.190186');

-- ===============================================
-- RÉACTIVATION DES CONTRAINTES
-- ===============================================
SET session_replication_role = DEFAULT;

-- Fin de l'export
COMMIT;

-- ===============================================
-- NOTES D'UTILISATION
-- ===============================================
-- Ce fichier contient un export complet de la base de données au 07/06/2025
-- 
-- Pour restaurer :
-- 1. Créer une nouvelle base de données PostgreSQL
-- 2. Exécuter ce script SQL
-- 3. Vérifier que toutes les séquences sont correctement configurées
--
-- Tables exportées :
-- - companies (4 enregistrements)
-- - users (6 enregistrements) 
-- - meeting_types (3 enregistrements)
-- - meetings (1 enregistrement)
-- - agenda_items (9 enregistrements)
-- - votes (7 enregistrements)
-- - vote_responses (6 enregistrements)
-- - meeting_participants (2 enregistrements)
-- - meeting_type_access (2 enregistrements)
-- - meeting_type_roles (4 enregistrements)
--
-- ATTENTION : Les mots de passe sont hashés avec bcrypt
-- Variables d'environnement nécessaires :
-- - DATABASE_URL
-- - BREVO_API_KEY  
-- - SESSION_SECRET
