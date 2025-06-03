import React, { useState, useEffect } from 'react';
import { Clock, Users, ChevronRight, ChevronLeft, CheckCircle, Circle, Play, Pause, RotateCcw, Settings, Plus, Edit, Trash2, Link, Vote, BarChart3, LogOut, UserPlus, Calendar } from 'lucide-react';

const MeetingPresenter = () => {
  // États principaux
  const [currentView, setCurrentView] = useState('login'); // 'login' | 'dashboard' | 'meeting' | 'admin'
  const [currentUser, setCurrentUser] = useState(null);
  const [currentMeeting, setCurrentMeeting] = useState(null);
  
  // États de la réunion
  const [currentTopic, setCurrentTopic] = useState(0);
  const [completedTopics, setCompletedTopics] = useState(new Set());
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [editingContent, setEditingContent] = useState(null);
  const [editingDuration, setEditingDuration] = useState(null);
  const [editingParticipants, setEditingParticipants] = useState(false);
  const [showReorganize, setShowReorganize] = useState(false);
  const [agendaContent, setAgendaContent] = useState({});
  const [agendaDurations, setAgendaDurations] = useState({});
  
  // États pour les nouvelles fonctionnalités
  const [showCreateMeeting, setShowCreateMeeting] = useState(false);
  const [showVisualLink, setShowVisualLink] = useState(false);
  const [showVoting, setShowVoting] = useState(false);
  const [editingVisualLink, setEditingVisualLink] = useState(null);
  const [votes, setVotes] = useState({});

  // Données utilisateurs (simulation - sera remplacé par la base de données)
  const [users] = useState([
    {
      id: 1,
      email: 'admin@scc-cirque.org',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'SCC',
      role: 'salaried',
      permissions: {
        canView: true,
        canEdit: true,
        canManageAgenda: true,
        canManageParticipants: true,
        canCreateMeetings: true,
        canManageUsers: true,
        canVote: true,
        canSeeVoteResults: true
      }
    },
    {
      id: 2,
      email: 'christine.nissim@scc-cirque.org',
      password: 'membre123',
      firstName: 'Christine',
      lastName: 'Nissim',
      role: 'council_member',
      permissions: {
        canView: true,
        canEdit: false,
        canManageAgenda: false,
        canManageParticipants: false,
        canCreateMeetings: false,
        canManageUsers: false,
        canVote: true,
        canSeeVoteResults: true
      }
    }
  ]);

  // Données des réunions (simulation)
  const [meetings, setMeetings] = useState([
    {
      id: 1,
      title: "Conseil National - 05/06/2025",
      date: "2025-06-05",
      createdBy: 1,
      participants: [
        { id: 1, name: "Christine Nissim", present: true },
        { id: 2, name: "Valeria Vukadin", present: true },
        { id: 3, name: "Pauline BARBOUX", present: true },
        { id: 4, name: "Sabrina SOW", present: true },
        { id: 5, name: "Alexandrine BIANCO", present: true }
      ],
      agendaStructure: [
        {
          id: 0,
          title: "AGE",
          duration: 10,
          description: "Proposition de dates pour la visio préparatoire aux AGE (8-10 septembre)",
          type: "procedural",
          content: `**Proposition de dates pour la visio préparatoire aux AGE :**

• 8 septembre matin
• 8 septembre après midi  
• 9 septembre matin
• 9 septembre après midi
• 10 septembre matin
• 10 septembre après midi`,
          visualLink: null,
          isSubsection: false,
          subsections: [],
          votes: []
        },
        {
          id: 1,
          title: "Politiques publiques",
          duration: 25,
          description: "Retour réunion filière, DRAC, municipales, intersyndicale",
          type: "discussion",
          content: `**Vue d'ensemble des politiques publiques**

Cette section couvre l'ensemble des relations institutionnelles et des politiques publiques qui impactent le secteur du cirque.`,
          visualLink: null,
          isSubsection: false,
          votes: [
            {
              id: 'vote_1',
              question: "Approuvez-vous la stratégie proposée pour les politiques publiques ?",
              options: ["Oui", "Non", "Abstention"],
              results: { "Oui": 3, "Non": 1, "Abstention": 1 },
              userVotes: {},
              isOpen: true
            }
          ],
          subsections: [
            {
              id: 11,
              title: "Retour réunion filière",
              duration: 8,
              description: "Tensions avec la DGCA et proposition TdC",
              type: "discussion",
              content: `**Retour sur la réunion filière du 28 mai**

Proposition TdC d'une rencontre suite aux tensions avec la DGCA.`,
              isSubsection: true,
              votes: []
            }
          ]
        },
        {
          id: 3,
          title: "FSICPA",
          duration: 20,
          description: "Changements gouvernance SYNAVI, CPPNI, CNPS, coordination",
          type: "presentation",
          content: `**Changements de gouvernance au sein du SYNAVI**

Emmanuelle Gourvitch informe des changements importants.`,
          visualLink: "https://claude.ai/public/artifacts/f066c318-b5c5-408c-ab4c-0402cc687dcf",
          isSubsection: false,
          subsections: [],
          votes: []
        }
      ]
    }
  ]);

  // Fonction d'authentification
  const handleLogin = (email, password) => {
    console.log('Tentative de connexion:', email, password);
    const user = users.find(u => u.email === email && u.password === password);
    console.log('Utilisateur trouvé:', user);
    console.log('Liste des utilisateurs:', users);
    if (user) {
      setCurrentUser(user);
      setCurrentView('dashboard');
      console.log('Connexion réussie, changement de vue vers dashboard');
      return true;
    }
    console.log('Connexion échouée');
    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('login');
    setCurrentMeeting(null);
  };

  // Gestion des réunions
  const createMeeting = (meetingData) => {
    const newMeeting = {
      id: Date.now(),
      ...meetingData,
      createdBy: currentUser.id,
      participants: [],
      agendaStructure: [
        {
          id: 0,
          title: "Ouverture de séance",
          duration: 5,
          description: "Accueil et vérification du quorum",
          type: "procedural",
          content: "**Ouverture de la séance**\n\nAccueil des participants et vérification du quorum.",
          visualLink: null,
          isSubsection: false,
          subsections: [],
          votes: []
        }
      ]
    };
    setMeetings(prev => [...prev, newMeeting]);
    setShowCreateMeeting(false);
  };

  const openMeeting = (meeting) => {
    setCurrentMeeting(meeting);
    setCurrentView('meeting');
    setCurrentTopic(0);
    setCompletedTopics(new Set());
    setTimer(0);
    setIsTimerRunning(false);
  };

  // Fonctions utilitaires existantes
  const getFlatAgenda = () => {
    if (!currentMeeting) return [];
    const flat = [];
    currentMeeting.agendaStructure.forEach(section => {
      flat.push(section);
      if (section.subsections && section.subsections.length > 0) {
        section.subsections.forEach(subsection => {
          flat.push(subsection);
        });
      }
    });
    return flat;
  };

  const flatAgenda = getFlatAgenda();
  const totalDuration = flatAgenda.reduce((sum, item) => sum + (agendaDurations[item.id] || item.duration), 0);

  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTopicProgress = () => {
    return Math.round((completedTopics.size / flatAgenda.length) * 100);
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'procedural': return 'bg-blue-100 text-blue-800';
      case 'presentation': return 'bg-green-100 text-green-800';
      case 'discussion': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'procedural': return '📋';
      case 'presentation': return '📊';
      case 'discussion': return '💬';
      default: return '📝';
    }
  };

  const renderMarkdown = (text) => {
    if (!text) return "Aucun contenu détaillé disponible.";
    
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^### (.*$)/gm, '<h4 class="text-md font-semibold text-gray-800 mt-3 mb-1">$1</h4>')
      .replace(/^## (.*$)/gm, '<h3 class="text-lg font-semibold text-gray-800 mt-4 mb-2">$1</h3>')
      .replace(/^# (.*$)/gm, '<h2 class="text-xl font-bold text-gray-800 mt-4 mb-2">$1</h2>')
      .replace(/^• (.*$)/gm, '<li class="ml-4">$1</li>')
      .replace(/(<li.*<\/li>)/gs, '<ul class="list-disc ml-4 my-2">$1</ul>')
      .replace(/\n\n/g, '</p><p class="mb-2">')
      .replace(/^(?!<[h2-4]|<ul|<li)(.+)$/gm, '<p class="mb-2">$1</p>')
      .replace(/(<p class="mb-2"><\/p>)/g, '');
  };

  // Gestion des votes
  const handleVote = (voteId, option) => {
    if (!currentUser.permissions.canVote) return;
    
    setVotes(prev => ({
      ...prev,
      [voteId]: {
        ...prev[voteId],
        [currentUser.id]: option
      }
    }));
  };

  const getVoteResults = (vote) => {
    const userVotes = votes[vote.id] || {};
    const results = { ...vote.results };
    
    Object.values(userVotes).forEach(option => {
      results[option] = (results[option] || 0) + 1;
    });
    
    return results;
  };

  const hasUserVoted = (voteId) => {
    return votes[voteId] && votes[voteId][currentUser.id];
  };

  // Composant de connexion
  const LoginView = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const onSubmit = (e) => {
      e.preventDefault();
      console.log('Formulaire soumis avec:', email, password);
      if (handleLogin(email, password)) {
        setError('');
        console.log('Redirection vers dashboard');
      } else {
        setError('Email ou mot de passe incorrect');
        console.log('Erreur de connexion');
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              🎪 Conseil National SCC
            </h1>
            <p className="text-gray-600">Connexion à l'application de réunion</p>
          </div>
          
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="votre@email.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                console.log('Bouton cliqué, tentative de connexion...');
                onSubmit(e);
              }}
            >
              Se connecter
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            <p className="mb-2"><strong>Comptes de test :</strong></p>
            <div className="space-y-1">
              <p>
                <strong>Salarié :</strong> 
                <button 
                  onClick={() => {setEmail('admin@scc-cirque.org'); setPassword('admin123');}}
                  className="ml-1 text-indigo-600 hover:underline"
                >
                  admin@scc-cirque.org / admin123
                </button>
              </p>
              <p>
                <strong>Membre CN :</strong> 
                <button 
                  onClick={() => {setEmail('christine.nissim@scc-cirque.org'); setPassword('membre123');}}
                  className="ml-1 text-indigo-600 hover:underline"
                >
                  christine.nissim@scc-cirque.org / membre123
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Composant dashboard
  const DashboardView = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Tableau de bord - {currentUser.firstName} {currentUser.lastName}
              </h1>
              <p className="text-gray-600">
                {currentUser.role === 'salaried' ? 'Salarié SCC' : 'Membre du Conseil National'}
              </p>
            </div>
            <div className="flex gap-2">
              {currentUser.permissions.canCreateMeetings && (
                <button
                  onClick={() => setShowCreateMeeting(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Nouvelle réunion
                </button>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>

        {/* Liste des réunions */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Réunions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {meetings.map(meeting => (
              <div key={meeting.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-semibold text-gray-800">{meeting.title}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">{meeting.date}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {meeting.participants.length} participants
                  </span>
                  <button
                    onClick={() => openMeeting(meeting)}
                    className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors text-sm"
                  >
                    Ouvrir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal création réunion */}
        {showCreateMeeting && (
          <CreateMeetingModal 
            onClose={() => setShowCreateMeeting(false)}
            onCreate={createMeeting}
          />
        )}
      </div>
    </div>
  );

  // Modal de création de réunion
  const CreateMeetingModal = ({ onClose, onCreate }) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');

    const handleSubmit = (e) => {
      e.preventDefault();
      if (title && date) {
        onCreate({ title, date });
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Nouvelle réunion</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titre de la réunion
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Conseil National - DD/MM/YYYY"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Créer
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Composant système de vote
  const VotingSection = ({ topic }) => {
    if (!topic.votes || topic.votes.length === 0) return null;

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
          <Vote className="w-4 h-4" />
          Votes en cours
        </h4>
        
        {topic.votes.map(vote => (
          <div key={vote.id} className="mb-4 last:mb-0">
            <p className="font-medium text-gray-800 mb-2">{vote.question}</p>
            
            {vote.isOpen && currentUser.permissions.canVote && !hasUserVoted(vote.id) ? (
              <div className="space-y-2">
                {vote.options.map(option => (
                  <button
                    key={option}
                    onClick={() => handleVote(vote.id, option)}
                    className="block w-full text-left px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {hasUserVoted(vote.id) && (
                  <p className="text-sm text-green-600 mb-2">
                    ✓ Vous avez voté : {votes[vote.id][currentUser.id]}
                  </p>
                )}
                
                {currentUser.permissions.canSeeVoteResults && (
                  <div className="bg-white rounded border border-gray-200 p-3">
                    <p className="font-medium text-sm text-gray-700 mb-2">Résultats :</p>
                    {Object.entries(getVoteResults(vote)).map(([option, count]) => (
                      <div key={option} className="flex justify-between text-sm">
                        <span>{option}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Modal ajout lien visuel
  const VisualLinkModal = ({ topicId, currentLink, onClose, onSave }) => {
    const [link, setLink] = useState(currentLink || '');
    const [title, setTitle] = useState('');

    const handleSubmit = (e) => {
      e.preventDefault();
      if (link) {
        onSave(topicId, { link, title: title || 'Résumé visuel' });
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Ajouter un résumé visuel</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titre (optionnel)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Résumé visuel"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lien vers la présentation
              </label>
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="https://..."
                required
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Ajouter
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const currentAgendaItem = flatAgenda[currentTopic];

  // Vue principale selon l'état
  console.log('Vue actuelle:', currentView, 'Utilisateur:', currentUser);
  
  if (currentView === 'login') {
    return <LoginView />;
  }

  if (currentView === 'dashboard') {
    return <DashboardView />;
  }

  if (currentView === 'meeting' && currentMeeting) {
    return (
      <div className="w-screen h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col" style={{ aspectRatio: '16/9' }}>
        {/* Header optimisé 16:9 */}
        <div className="bg-white shadow-lg p-4 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-800 mb-1">
                🎪 {currentMeeting.title}
              </h1>
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Durée: {totalDuration} min
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {currentMeeting.participants.length} participants
                </div>
                <div className="flex items-center gap-1">
                  📊 Progression: {getTopicProgress()}%
                </div>
              </div>
            </div>
            
            {/* Timer et contrôles */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                ← Retour
              </button>
              
              {currentUser.permissions.canEdit && (
                <>
                  <button
                    onClick={() => setShowReorganize(!showReorganize)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      showReorganize ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                    } hover:bg-orange-200`}
                  >
                    {showReorganize ? '🔧 Terminer réorg.' : '🔧 Réorganiser'}
                  </button>
                  
                  <button
                    onClick={() => setShowVisualLink(true)}
                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                  >
                    <Link className="w-4 h-4 inline mr-1" />
                    Résumé visuel
                  </button>
                </>
              )}
              
              <button
                onClick={() => setShowContent(!showContent)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showContent ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                } hover:bg-purple-200`}
              >
                {showContent ? '📋 Masquer ordre du jour' : '📋 Voir ordre du jour complet'}
              </button>
              
              <div className="text-right">
                <div className="text-3xl font-mono font-bold text-indigo-600">
                  {formatTime(timer)}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      isTimerRunning 
                        ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setTimer(0)}
                    className="px-3 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getTopicProgress()}%` }}
            ></div>
          </div>
        </div>

        {/* Contenu principal en 16:9 */}
        <div className="flex-1 flex gap-4 p-4 min-h-0">
          {/* Sujet actuel - largeur adaptée selon showContent */}
          <div className={`bg-white rounded-xl shadow-lg flex flex-col transition-all ${
            showContent ? 'w-1/2' : 'flex-1'
          }`} style={{ minWidth: showContent ? '45%' : '65%' }}>
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(currentAgendaItem?.type)}`}>
                  {getTypeIcon(currentAgendaItem?.type)} {currentAgendaItem?.type}
                </span>
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {currentTopic + 1} / {flatAgenda.length}
                  {currentAgendaItem?.isSubsection && (
                    <span className="ml-1 text-xs">📄</span>
                  )}
                </span>
              </div>
              
              <h2 className="text-3xl font-bold text-gray-800 mb-3 flex-shrink-0">
                {currentAgendaItem?.isSubsection && '↳ '}
                {currentAgendaItem?.title}
              </h2>
              
              <p className="text-lg text-gray-600 mb-4 flex-shrink-0">
                {currentAgendaItem?.description}
              </p>

              {/* Système de vote */}
              <VotingSection topic={currentAgendaItem} />

              {/* Zone de contenu détaillé modifiable */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4 flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-800">Contenu détaillé</h4>
                  {currentUser.permissions.canEdit && (
                    <button
                      onClick={() => setEditingContent(editingContent === currentAgendaItem?.id ? null : currentAgendaItem?.id)}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        editingContent === currentAgendaItem?.id
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                      }`}
                    >
                      {editingContent === currentAgendaItem?.id ? '💾 Sauvegarder' : '✏️ Éditer'}
                    </button>
                  )}
                </div>
                
                {editingContent === currentAgendaItem?.id ? (
                  <textarea
                    defaultValue={agendaContent[currentAgendaItem.id] || currentAgendaItem?.content}
                    className="flex-1 w-full p-3 border border-gray-300 rounded-lg resize-none font-mono text-sm"
                    placeholder="Saisissez le contenu détaillé de ce point..."
                    id="content-editor"
                    onBlur={(e) => {
                      setAgendaContent(prev => ({
                        ...prev,
                        [currentAgendaItem.id]: e.target.value
                      }));
                      setEditingContent(null);
                    }}
                  />
                ) : (
                  <div className="flex-1 overflow-y-auto">
                    <div 
                      className="text-sm text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ 
                        __html: renderMarkdown(agendaContent[currentAgendaItem?.id] || currentAgendaItem?.content)
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Lien vers résumé visuel si disponible */}
              {currentAgendaItem?.visualLink && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600">📊</span>
                      <span className="text-sm font-medium text-blue-800">Résumé visuel disponible</span>
                    </div>
                    {currentUser.permissions.canEdit && (
                      <button
                        onClick={() => setEditingVisualLink(currentAgendaItem.id)}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                  <a 
                    href={currentAgendaItem.visualLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm underline"
                  >
                    Voir la présentation → {currentAgendaItem.visualLink}
                  </a>
                </div>
              )}
              
              <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  {editingDuration === currentAgendaItem?.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="120"
                        defaultValue={agendaDurations[currentAgendaItem?.id] || currentAgendaItem?.duration}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                        id="duration-editor"
                        onBlur={(e) => {
                          const duration = parseInt(e.target.value) || 1;
                          setAgendaDurations(prev => ({
                            ...prev,
                            [currentAgendaItem.id]: duration
                          }));
                          setEditingDuration(null);
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const duration = parseInt(e.target.value) || 1;
                            setAgendaDurations(prev => ({
                              ...prev,
                              [currentAgendaItem.id]: duration
                            }));
                            setEditingDuration(null);
                          }
                        }}
                        autoFocus
                      />
                      <span className="text-sm text-gray-600">min</span>
                    </div>
                  ) : (
                    <span 
                      className={`font-semibold text-indigo-600 ${currentUser.permissions.canEdit ? 'cursor-pointer hover:underline' : ''}`}
                      onClick={() => currentUser.permissions.canEdit && setEditingDuration(currentAgendaItem?.id)}
                      title={currentUser.permissions.canEdit ? "Cliquer pour modifier" : ""}
                    >
                      {agendaDurations[currentAgendaItem?.id] || currentAgendaItem?.duration} minutes
                    </span>
                  )}
                </div>
                
                <button
                  onClick={() => {
                    if (completedTopics.has(currentAgendaItem?.id)) {
                      setCompletedTopics(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(currentAgendaItem?.id);
                        return newSet;
                      });
                    } else {
                      setCompletedTopics(prev => new Set([...prev, currentAgendaItem?.id]));
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
                >
                  {completedTopics.has(currentAgendaItem?.id) ? 
                    <CheckCircle className="w-5 h-5" /> : 
                    <Circle className="w-5 h-5" />
                  }
                  {completedTopics.has(currentAgendaItem?.id) ? 'Terminé' : 'Marquer terminé'}
                </button>
              </div>
            </div>

            {/* Navigation en bas */}
            <div className="flex justify-between p-4 border-t">
              <button
                onClick={() => setCurrentTopic(Math.max(0, currentTopic - 1))}
                disabled={currentTopic === 0}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Précédent
              </button>
              
              <button
                onClick={() => setCurrentTopic(Math.min(flatAgenda.length - 1, currentTopic + 1))}
                disabled={currentTopic === flatAgenda.length - 1}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Suivant
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Panneau ordre du jour complet */}
          {showContent && (
            <div className="w-1/2 bg-white rounded-xl shadow-lg flex flex-col">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">
                  📋 Ordre du jour complet
                </h3>
                <button
                  onClick={() => setShowContent(false)}
                  className="px-3 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded text-sm transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-4">
                  {currentMeeting.agendaStructure.map((section) => (
                    <div key={section.id}>
                      {/* Section principale */}
                      <div 
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          flatAgenda.findIndex(item => item.id === section.id) === currentTopic
                            ? 'border-indigo-300 bg-indigo-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setCurrentTopic(flatAgenda.findIndex(item => item.id === section.id))}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getTypeIcon(section.type)}</span>
                            <h4 className="font-semibold text-gray-800">{section.title}</h4>
                            {section.visualLink && (
                              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">📊 Résumé</span>
                            )}
                            {section.votes && section.votes.length > 0 && (
                              <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-1 rounded">🗳️ Vote</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">{agendaDurations[section.id] || section.duration} min</span>
                            {completedTopics.has(section.id) ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">{section.description}</p>
                      </div>
                      
                      {/* Sous-sections */}
                      {section.subsections && section.subsections.length > 0 && (
                        <div className="ml-6 mt-2 space-y-2">
                          {section.subsections.map((subsection) => (
                            <div 
                              key={subsection.id}
                              className={`border rounded-lg p-3 cursor-pointer transition-all border-l-4 ${
                                flatAgenda.findIndex(item => item.id === subsection.id) === currentTopic
                                  ? 'border-indigo-300 bg-indigo-50 border-l-indigo-400' 
                                  : 'border-gray-200 hover:border-gray-300 border-l-gray-400'
                              }`}
                              onClick={() => setCurrentTopic(flatAgenda.findIndex(item => item.id === subsection.id))}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span>↳</span>
                                  <span className="font-medium text-sm">{subsection.title}</span>
                                  {subsection.votes && subsection.votes.length > 0 && (
                                    <span className="text-xs bg-yellow-100 text-yellow-600 px-1 py-0.5 rounded">🗳️</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">{agendaDurations[subsection.id] || subsection.duration} min</span>
                                  {completedTopics.has(subsection.id) ? (
                                    <CheckCircle className="w-3 h-3 text-green-600" />
                                  ) : (
                                    <Circle className="w-3 h-3 text-gray-400" />
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-gray-600 mt-1 ml-4">{subsection.description}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Résumé du timing */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">📊 Résumé timing</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total prévu:</span>
                        <span className="font-medium">{totalDuration} min</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Temps écoulé:</span>
                        <span className="font-medium">{formatTime(timer)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sujets terminés:</span>
                        <span className="font-medium">{completedTopics.size}/{flatAgenda.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Progression:</span>
                        <span className="font-medium">{getTopicProgress()}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sidebar - largeur adaptée */}
          <div className={`flex flex-col gap-4 flex-shrink-0 transition-all ${
            showContent ? 'w-64' : 'w-80'
          }`}>
            {/* Ordre du jour compact */}
            <div className="bg-white rounded-xl shadow-lg flex flex-col" style={{ height: showContent ? '45%' : '60%' }}>
              <div className="p-4 border-b flex-shrink-0">
                <h3 className="text-lg font-bold text-gray-800">Ordre du jour</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <div className="space-y-2">
                  {flatAgenda.map((item, index) => (
                    <div
                      key={`${item.id}-${item.isSubsection ? 'sub' : 'main'}`}
                      onClick={() => setCurrentTopic(index)}
                      className={`p-3 rounded-lg cursor-pointer transition-all text-sm ${
                        index === currentTopic
                          ? 'bg-indigo-100 border-2 border-indigo-300'
                          : 'bg-gray-50 hover:bg-gray-100'
                      } ${item.isSubsection ? 'ml-4 border-l-2 border-gray-300' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-lg flex-shrink-0">{getTypeIcon(item.type)}</span>
                          <span className={`font-medium truncate ${item.isSubsection ? 'text-sm' : ''}`}>
                            {item.isSubsection && '↳ '}
                            {item.title}
                          </span>
                          {item.visualLink && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-1 rounded">📊</span>
                          )}
                          {item.votes && item.votes.length > 0 && (
                            <span className="text-xs bg-yellow-100 text-yellow-600 px-1 rounded">🗳️</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-500">{agendaDurations[item.id] || item.duration}min</span>
                          {completedTopics.has(item.id) ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Participants */}
            <div className="bg-white rounded-xl shadow-lg flex flex-col" style={{ height: showContent ? '35%' : '25%' }}>
              <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
                <h3 className="text-lg font-bold text-gray-800">Participants</h3>
                {currentUser.permissions.canManageParticipants && (
                  <button
                    onClick={() => setEditingParticipants(!editingParticipants)}
                    className="px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-sm transition-colors"
                  >
                    {editingParticipants ? '✓' : '✏️'}
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <div className="space-y-2">
                  {currentMeeting.participants.map((participant, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${participant.present ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="truncate">{participant.name}</span>
                      </div>
                      {editingParticipants && currentUser.permissions.canManageParticipants && (
                        <button
                          onClick={() => {
                            const newParticipants = [...currentMeeting.participants];
                            newParticipants.splice(index, 1);
                            setMeetings(prev => prev.map(m => 
                              m.id === currentMeeting.id 
                                ? { ...m, participants: newParticipants }
                                : m
                            ));
                            setCurrentMeeting(prev => ({ ...prev, participants: newParticipants }));
                          }}
                          className="text-red-500 hover:text-red-700 text-xs px-1"
                          title="Supprimer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  {editingParticipants && currentUser.permissions.canManageParticipants && (
                    <button
                      onClick={() => {
                        const name = window.prompt('Nom du nouveau participant :');
                        if (name && name.trim()) {
                          const newParticipant = { 
                            id: Date.now(), 
                            name: name.trim(), 
                            present: true 
                          };
                          const newParticipants = [...currentMeeting.participants, newParticipant];
                          setMeetings(prev => prev.map(m => 
                            m.id === currentMeeting.id 
                              ? { ...m, participants: newParticipants }
                              : m
                          ));
                          setCurrentMeeting(prev => ({ ...prev, participants: newParticipants }));
                        }
                      }}
                      className="w-full mt-2 py-1 border-2 border-dashed border-gray-300 text-gray-500 hover:border-blue-300 hover:text-blue-600 rounded text-sm transition-colors"
                    >
                      + Ajouter participant
                    </button>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                  <div><strong>Connecté :</strong> {currentUser.firstName} {currentUser.lastName}</div>
                  <div><strong>Rôle :</strong> {currentUser.role === 'salaried' ? 'Salarié SCC' : 'Membre CN'}</div>
                </div>
              </div>
            </div>

            {/* Stats rapides */}
            <div className="bg-white rounded-xl shadow-lg p-4 flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-800 mb-3">Statistiques</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Sujets terminés:</span>
                  <span className="font-medium">{completedTopics.size}/{flatAgenda.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Temps écoulé:</span>
                  <span className="font-medium">{formatTime(timer)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Temps prévu:</span>
                  <span className="font-medium">{totalDuration} min</span>
                </div>
                <div className="flex justify-between">
                  <span>Progression:</span>
                  <span className="font-medium">{getTopicProgress()}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        {showVisualLink && (
          <VisualLinkModal
            topicId={currentAgendaItem?.id}
            currentLink={currentAgendaItem?.visualLink}
            onClose={() => setShowVisualLink(false)}
            onSave={(topicId, linkData) => {
              // Mise à jour du lien visuel
              const updateAgenda = (items) => {
                return items.map(item => {
                  if (item.id === topicId) {
                    return { ...item, visualLink: linkData.link };
                  }
                  if (item.subsections) {
                    return { ...item, subsections: updateAgenda(item.subsections) };
                  }
                  return item;
                });
              };
              
              const updatedAgenda = updateAgenda(currentMeeting.agendaStructure);
              const updatedMeeting = { ...currentMeeting, agendaStructure: updatedAgenda };
              
              setCurrentMeeting(updatedMeeting);
              setMeetings(prev => prev.map(m => m.id === currentMeeting.id ? updatedMeeting : m));
              setShowVisualLink(false);
            }}
          />
        )}
      </div>
    );
  }

  // Vue par défaut
  return <LoginView />;
};

export default MeetingPresenter;