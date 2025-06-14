import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Plus, Calendar, Users, Clock, Play, Edit3, Trash2, Copy, LogOut, FileDown, Settings, Eye, Filter, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { MiniCalendar } from '@/components/MiniCalendar';
import { getMeetingData } from '@/data/agenda';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type MeetingType } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  participants: string[];
  pouvoir: string;
  status: 'draft' | 'scheduled' | 'in_progress' | 'completed';
  agendaItemsCount: number;
  totalDuration: number;
  createdAt: string;
  meetingTypeId?: number;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, logout, requirePermission } = useAuth();
  const [viewAsElu, setViewAsElu] = useState(false);
  const [selectedMeetingTypeFilter, setSelectedMeetingTypeFilter] = useState<string>('all');
  const [showPastMeetings, setShowPastMeetings] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Récupérer les types de réunions disponibles
  const { data: meetingTypes } = useQuery({
    queryKey: ['/api/meeting-types'],
  });

  // Récupérer les réunions depuis la base de données
  const { data: databaseMeetings = [], isLoading: meetingsLoading, refetch: refetchMeetings } = useQuery({
    queryKey: ['/api/meetings'],
    retry: false,
  });
  
  // Fonction pour charger les informations de réunion depuis localStorage
  const loadMeetingInfo = (meetingId: string) => {
    const savedInfo = localStorage.getItem(`meetingInfo_${meetingId}`);
    return savedInfo ? JSON.parse(savedInfo) : null;
  };

  // Fonction pour calculer le nombre réel d'éléments d'agenda après suppressions
  const calculateRealAgendaItemsCount = (meetingId: string) => {
    try {
      const meetingData = getMeetingData(meetingId);
      const deletedItemsKey = `deleted-agenda-items-${meetingId}`;
      const deletedItems = JSON.parse(localStorage.getItem(deletedItemsKey) || '[]');
      
      if (meetingData && meetingData.agendaItems) {
        const activeItems = meetingData.agendaItems.filter(item => !deletedItems.includes(item.id));
        return activeItems.length;
      }
      
      return 0;
    } catch (error) {
      return 0;
    }
  };

  // Fonction pour calculer la durée totale réelle d'une réunion
  const calculateMeetingDuration = (meetingId: string) => {
    try {
      const meetingData = getMeetingData(meetingId);
      const deletedItemsKey = `deleted-agenda-items-${meetingId}`;
      const deletedItems = JSON.parse(localStorage.getItem(deletedItemsKey) || '[]');
      
      if (meetingData && meetingData.agendaItems) {
        const activeItems = meetingData.agendaItems.filter(item => !deletedItems.includes(item.id));
        return activeItems.reduce((total: number, item: any) => {
          return total + (item.duration || 0);
        }, 0);
      }
      
      return 120;
    } catch (error) {
      return 120;
    }
  };

  // Transformer les données de la base en format local
  const transformDatabaseMeetings = (dbMeetings: any[]): Meeting[] => {
    return dbMeetings.map(meeting => ({
      id: meeting.id.toString(),
      title: meeting.title,
      date: new Date(meeting.date).toISOString().split('T')[0],
      time: new Date(meeting.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      description: meeting.description || '',
      participants: [], // Les participants seront chargés séparément si nécessaire
      pouvoir: '',
      status: meeting.status as 'draft' | 'scheduled' | 'in_progress' | 'completed',
      agendaItemsCount: 0, // Sera calculé à partir des items d'agenda
      totalDuration: 0,
      createdAt: new Date(meeting.createdAt).toISOString().split('T')[0],
      meetingTypeId: meeting.meetingTypeId
    }));
  };

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fonction pour formater la date au format français
  const formatFrenchDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    };
    return date.toLocaleDateString('fr-FR', options);
  };

  // Fonction pour déterminer si une réunion est passée
  const isPastMeeting = (meeting: Meeting) => {
    const today = new Date();
    const meetingDate = new Date(meeting.date);
    return meetingDate < today;
  };

  // Fonction pour filtrer les réunions
  const getFilteredMeetings = (meetings: Meeting[]) => {
    return meetings.filter(meeting => {
      // Filtre par type de réunion
      const typeFilter = selectedMeetingTypeFilter === 'all' || 
                        meeting.meetingTypeId?.toString() === selectedMeetingTypeFilter;
      
      // Filtre par réunions passées/futures
      const pastFilter = showPastMeetings || !isPastMeeting(meeting);
      
      return typeFilter && pastFilter;
    });
  };

  // Fonction pour obtenir le type de réunion
  const getMeetingType = (meetingTypeId?: number): MeetingType | undefined => {
    return Array.isArray(meetingTypes) ? meetingTypes.find((type: MeetingType) => type.id === meetingTypeId) : undefined;
  };

  // Utiliser directement les données de la base de données
  useEffect(() => {
    if (Array.isArray(databaseMeetings) && databaseMeetings.length > 0) {
      const transformedMeetings = transformDatabaseMeetings(databaseMeetings);
      setMeetings(transformedMeetings);
    } else {
      setMeetings([]);
    }
  }, [databaseMeetings]);

  // Fonction pour rafraîchir les données des réunions
  const refreshMeetings = () => {
    refetchMeetings();
  };



  // Supprimer le rafraîchissement automatique qui cause la boucle infinie
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [newMeeting, setNewMeeting] = useState<Partial<Meeting>>({
    title: '',
    date: '',
    time: '',
    description: '',
    participants: [],
    pouvoir: '',
    status: 'draft'
  });
  const [newParticipant, setNewParticipant] = useState('');

  const createMeeting = () => {
    const meeting: Meeting = {
      id: Date.now().toString(),
      title: newMeeting.title || 'Nouvelle réunion',
      date: newMeeting.date || new Date().toISOString().split('T')[0],
      time: newMeeting.time || '14:00',
      description: newMeeting.description || '',
      participants: newMeeting.participants || [],
      pouvoir: newMeeting.pouvoir || '',
      status: 'draft',
      agendaItemsCount: 0,
      totalDuration: 0,
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    setMeetings([...meetings, meeting]);
    setShowCreateModal(false);
    setNewMeeting({
      title: '',
      date: '',
      time: '',
      description: '',
      participants: [],
      pouvoir: '',
      status: 'draft'
    });
  };

  // Mutation pour supprimer une réunion
  const deleteMeetingMutation = useMutation({
    mutationFn: async (id: string) => {
      // Convertir l'ID string en number pour l'API
      const numericId = parseInt(id);
      if (isNaN(numericId)) {
        throw new Error("ID de réunion invalide");
      }
      return await apiRequest('DELETE', `/api/meetings/${numericId}`);
    },
    onSuccess: () => {
      // Invalider les caches liés aux réunions
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      toast({
        title: "Succès",
        description: "Réunion supprimée avec succès",
      });
      // Rafraîchir la liste locale
      refreshMeetings();
    },
    onError: (error: any) => {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer la réunion",
        variant: "destructive",
      });
    },
  });

  const deleteMeeting = (id: string) => {
    // Pour les réunions de démonstration (avec des IDs string non-numériques)
    if (isNaN(parseInt(id))) {
      // Suppression locale uniquement pour les réunions de démo
      setMeetings(meetings.filter(m => m.id !== id));
      toast({
        title: "Succès",
        description: "Réunion de démonstration supprimée",
      });
    } else {
      // Suppression via API pour les vraies réunions
      deleteMeetingMutation.mutate(id);
    }
  };

  // Gestionnaires pour le calendrier
  const handleMeetingSelect = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    // Redirection vers la page de présentation correspondante
    setLocation(`/simple-presenter/${meeting.id}`);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    const dateMeetings = meetings.filter(meeting => {
      const meetingDate = new Date(meeting.date).toDateString();
      return meetingDate === date.toDateString();
    });
    if (dateMeetings.length === 1) {
      setSelectedMeeting(dateMeetings[0]);
    } else {
      setSelectedMeeting(null);
    }
  };

  const duplicateMeeting = (meeting: Meeting) => {
    const duplicated: Meeting = {
      ...meeting,
      id: Date.now().toString(),
      title: meeting.title + ' (Copie)',
      status: 'draft',
      createdAt: new Date().toISOString().split('T')[0]
    };
    setMeetings([...meetings, duplicated]);
  };



  const addParticipant = () => {
    if (newParticipant.trim()) {
      setNewMeeting({
        ...newMeeting,
        participants: [...(newMeeting.participants || []), newParticipant.trim()]
      });
      setNewParticipant('');
    }
  };

  const removeParticipant = (index: number) => {
    const participants = newMeeting.participants || [];
    setNewMeeting({
      ...newMeeting,
      participants: participants.filter((_, i) => i !== index)
    });
  };

  const getStatusColor = (status: Meeting['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: Meeting['status']) => {
    switch (status) {
      case 'draft': return 'Brouillon';
      case 'scheduled': return 'Planifiée';
      case 'in_progress': return 'En cours';
      case 'completed': return 'Terminée';
      default: return 'Inconnu';
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h${mins.toString().padStart(2, '0')}` : `${mins}min`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* En-tête */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestionnaire de Réunions</h1>
            <p className="text-gray-600 mt-2">Organisez et animez vos réunions efficacement</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Informations utilisateur */}
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-600">{user?.role}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-medium text-sm">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </span>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center gap-2">
              {/* Mode visualisation pour les salariés */}
              {user?.role === 'Salarié·es SCC' && (
                <Button
                  variant={viewAsElu ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewAsElu(!viewAsElu)}
                  className="flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  {viewAsElu ? "Mode Salarié" : "Voir comme Élu"}
                </Button>
              )}

              {/* Administration pour les salariés */}
              {(user?.role === 'Salarié·es SCC' && !viewAsElu) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation('/admin')}
                  className="flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Administration
                </Button>
              )}

              {/* Nouvelle réunion - uniquement pour les salariés ou mode salarié */}
              {(user?.role === 'Salarié·es SCC' && !viewAsElu) && (
                <Button 
                  onClick={() => setShowCreateModal(true)} 
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nouvelle Réunion
                </Button>
              )}

              {/* Bouton de déconnexion */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  logout();
                  setLocation('/login');
                }}
                className="flex items-center gap-2 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>

        {/* Filtres et contrôles */}
        <div className="mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center">
                {/* Filtre par type de réunion */}
                <div className="flex items-center gap-2 min-w-[200px]">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <Label htmlFor="meeting-type-filter" className="text-sm font-medium">Type de réunion :</Label>
                  <Select
                    value={selectedMeetingTypeFilter}
                    onValueChange={setSelectedMeetingTypeFilter}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Tous les types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types</SelectItem>
                      {Array.isArray(meetingTypes) && meetingTypes.map((type: MeetingType) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: type.color || '#gray' }}
                            />
                            {type.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Toggle réunions passées */}
                <div className="flex items-center gap-2">
                  <Label htmlFor="show-past-meetings" className="text-sm font-medium">
                    Afficher les réunions passées :
                  </Label>
                  <Switch
                    id="show-past-meetings"
                    checked={showPastMeetings}
                    onCheckedChange={setShowPastMeetings}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Interface principale avec calendrier */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Liste des réunions - 3 colonnes */}
          <div className="lg:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Réunions</h2>
              {selectedDate && (
                <div className="text-sm text-gray-600">
                  Réunions du {selectedDate.toLocaleDateString('fr-FR', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {getFilteredMeetings(meetings).map((meeting) => {
            const meetingType = getMeetingType(meeting.meetingTypeId);
            return (
            <Card 
              key={meeting.id} 
              className="hover:shadow-lg transition-shadow"
              style={{ 
                borderLeft: meetingType ? `4px solid ${meetingType.color}` : '4px solid #e5e7eb'
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{meeting.title}</CardTitle>
                    {meetingType && (
                      <Badge 
                        variant="secondary"
                        className="text-white"
                        style={{ backgroundColor: meetingType.color || '#6b7280' }}
                      >
                        {meetingType.name}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{formatFrenchDate(meeting.date)} à {meeting.time}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>{meeting.participants.length} participants</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{meeting.agendaItemsCount} points - {formatDuration(meeting.totalDuration)}</span>
                </div>
                
                {meeting.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{meeting.description}</p>
                )}
                
                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    onClick={() => setLocation(`/simple-presenter/${meeting.id}`)}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Voir la réunion
                  </Button>
                  
                  {/* Boutons d'édition - cachés en mode "Voir comme Élu" */}
                  {(user?.role === 'Salarié·es SCC' && !viewAsElu) && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => duplicateMeeting(meeting)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => deleteMeeting(meeting.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
            );
          })}
            </div>
          </div>

          {/* Mini-calendrier - 1 colonne */}
          <div className="lg:col-span-1">
            <MiniCalendar
              meetings={meetings}
              onMeetingSelect={handleMeetingSelect}
              onDateSelect={handleDateSelect}
              selectedDate={selectedDate}
            />

            {/* Détails de la réunion sélectionnée */}
            {selectedMeeting && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-lg">{selectedMeeting.title}</CardTitle>
                  <Badge className={getStatusColor(selectedMeeting.status)}>
                    {getStatusLabel(selectedMeeting.status)}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{selectedMeeting.date} à {selectedMeeting.time}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{selectedMeeting.participants.length} participants</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{selectedMeeting.agendaItemsCount} points - {formatDuration(selectedMeeting.totalDuration)}</span>
                  </div>

                  {selectedMeeting.description && (
                    <p className="text-sm text-gray-600">{selectedMeeting.description}</p>
                  )}

                  <Button 
                    size="sm" 
                    onClick={() => setLocation(`/presenter/${selectedMeeting.id}`)}
                    className="w-full mt-3"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Présenter cette réunion
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Modal de création */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Créer une nouvelle réunion</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Titre de la réunion</Label>
                  <Input
                    id="title"
                    value={newMeeting.title}
                    onChange={(e) => setNewMeeting({...newMeeting, title: e.target.value})}
                    placeholder="Ex: Conseil d'Administration Q4 2024"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newMeeting.date}
                      onChange={(e) => setNewMeeting({...newMeeting, date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="time">Heure</Label>
                    <Input
                      id="time"
                      type="time"
                      value={newMeeting.time}
                      onChange={(e) => setNewMeeting({...newMeeting, time: e.target.value})}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newMeeting.description}
                    onChange={(e) => setNewMeeting({...newMeeting, description: e.target.value})}
                    placeholder="Description de la réunion..."
                    className="min-h-20"
                  />
                </div>
                
                <div>
                  <Label htmlFor="pouvoir">Pouvoirs</Label>
                  <Textarea
                    id="pouvoir"
                    value={newMeeting.pouvoir}
                    onChange={(e) => setNewMeeting({...newMeeting, pouvoir: e.target.value})}
                    placeholder="Pouvoirs délégués..."
                    className="min-h-16"
                  />
                </div>
                
                <div>
                  <Label>Participants</Label>
                  <div className="space-y-2">
                    {(newMeeting.participants || []).map((participant, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input value={participant} readOnly className="flex-1" />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => removeParticipant(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    
                    <div className="flex gap-2">
                      <Input
                        value={newParticipant}
                        onChange={(e) => setNewParticipant(e.target.value)}
                        placeholder="Nom du participant"
                        onKeyPress={(e) => e.key === 'Enter' && addParticipant()}
                      />
                      <Button onClick={addParticipant}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                    Annuler
                  </Button>
                  <Button onClick={createMeeting}>
                    Créer la réunion
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}