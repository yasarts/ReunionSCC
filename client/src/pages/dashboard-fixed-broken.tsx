import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Users, FileText, Plus, Edit, Trash2, LogOut, Play, Eye, Settings } from 'lucide-react';

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

interface MeetingType {
  id: number;
  name: string;
  description?: string;
  color: string | null;
  permissions: any;
}

export default function Dashboard() {
  const [typeFilter, setTypeFilter] = useState('all');
  const [showPastMeetings, setShowPastMeetings] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [newParticipant, setNewParticipant] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [newMeeting, setNewMeeting] = useState<Partial<Meeting>>({
    title: '',
    date: '',
    time: '',
    description: '',
    status: 'draft',
    meetingTypeId: undefined
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Récupérer les types de réunions
  const { data: meetingTypes } = useQuery({
    queryKey: ['/api/meeting-types'],
  });

  // Récupérer les réunions depuis la base de données
  const { data: databaseMeetings = [], isLoading: meetingsLoading, refetch: refetchMeetings } = useQuery({
    queryKey: ['/api/meetings'],
    retry: false,
  });

  // Transformer les données de la base en format local
  const transformDatabaseMeetings = (dbMeetings: any[]): Meeting[] => {
    return dbMeetings.map(meeting => ({
      id: meeting.id.toString(),
      title: meeting.title,
      date: new Date(meeting.date).toISOString().split('T')[0],
      time: new Date(meeting.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      description: meeting.description || '',
      participants: [],
      pouvoir: '',
      status: meeting.status as 'draft' | 'scheduled' | 'in_progress' | 'completed',
      agendaItemsCount: 0,
      totalDuration: 0,
      createdAt: new Date(meeting.createdAt).toISOString().split('T')[0],
      meetingTypeId: meeting.meetingTypeId
    }));
  };

  // Utiliser directement les données transformées sans useState local
  const meetings = useMemo(() => {
    if (Array.isArray(databaseMeetings)) {
      return transformDatabaseMeetings(databaseMeetings);
    }
    return [];
  }, [databaseMeetings]);

  // Fonction pour rafraîchir les données des réunions
  const refreshMeetings = () => {
    refetchMeetings();
  };

  // Fonction pour obtenir le type de réunion
  const getMeetingType = (meetingTypeId?: number): MeetingType | undefined => {
    return Array.isArray(meetingTypes) ? meetingTypes.find((type: MeetingType) => type.id === meetingTypeId) : undefined;
  };

  // Fonction pour vérifier si une réunion est passée
  const isPastMeeting = (meeting: Meeting) => {
    const meetingDate = new Date(`${meeting.date}T${meeting.time}`);
    return meetingDate < new Date();
  };

  // Filtrer les réunions
  const filteredMeetings = meetings.filter(meeting => {
    const typeMatch = typeFilter === 'all' || meeting.meetingTypeId?.toString() === typeFilter;
    const pastFilter = showPastMeetings || !isPastMeeting(meeting);
    return typeMatch && pastFilter;
  });

  // Mutation pour supprimer une réunion
  const deleteMeetingMutation = useMutation({
    mutationFn: async (id: string) => {
      const numericId = parseInt(id);
      if (isNaN(numericId)) {
        throw new Error("ID de réunion invalide");
      }
      return await apiRequest('DELETE', `/api/meetings/${numericId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      toast({
        title: "Succès",
        description: "Réunion supprimée avec succès",
      });
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
    deleteMeetingMutation.mutate(id);
  };



  const logout = () => {
    localStorage.removeItem('auth-token');
    setLocation('/login');
  };



  // Mutation pour créer une réunion
  const createMeetingMutation = useMutation({
    mutationFn: async (meetingData: any) => {
      return await apiRequest('POST', '/api/meetings', meetingData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      toast({
        title: "Succès",
        description: "Réunion créée avec succès",
      });
      setShowCreateModal(false);
      setNewMeeting({
        title: '',
        date: '',
        time: '',
        description: '',
        status: 'draft',
        meetingTypeId: undefined
      });
      refreshMeetings();
    },
    onError: (error: any) => {
      console.error('Erreur lors de la création:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la réunion",
        variant: "destructive",
      });
    },
  });

  const createMeeting = () => {
    if (!newMeeting.title || !newMeeting.date || !newMeeting.time || !newMeeting.meetingTypeId) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    const meetingDateTime = new Date(`${newMeeting.date}T${newMeeting.time}`);
    
    const meetingData = {
      title: newMeeting.title,
      description: newMeeting.description || '',
      date: meetingDateTime.toISOString(),
      meetingTypeId: newMeeting.meetingTypeId,
      status: 'draft'
    };

    createMeetingMutation.mutate(meetingData);
  };

  // Mutation pour modifier une réunion
  const updateMeetingMutation = useMutation({
    mutationFn: async (meetingData: Meeting) => {
      return await apiRequest('PUT', `/api/meetings/${meetingData.id}`, meetingData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      toast({
        title: "Succès",
        description: "Réunion modifiée avec succès",
      });
      setEditingMeeting(null);
      refreshMeetings();
    },
    onError: (error: any) => {
      console.error('Erreur lors de la modification:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier la réunion",
        variant: "destructive",
      });
    },
  });

  const updateMeeting = (meeting: Meeting) => {
    if (!meeting.title || !meeting.date || !meeting.time || !meeting.meetingTypeId) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    const meetingDateTime = new Date(`${meeting.date}T${meeting.time}`);
    
    const meetingData = {
      ...meeting,
      date: meetingDateTime.toISOString(),
      description: meeting.description || '',
    };

    updateMeetingMutation.mutate(meetingData);
  };

  const duplicateMeeting = (meeting: any) => {
    // TODO: Implement duplication via API
    toast({
      title: "Fonctionnalité à venir",
      description: "La duplication sera implémentée prochainement",
    });
  };

  // Afficher un indicateur de chargement si les données sont en cours de récupération
  if (meetingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des réunions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord</h1>
              <p className="text-gray-600 mt-1">
                Bienvenue {user?.firstName} {user?.lastName}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {user && (
                <Button 
                  onClick={() => setShowCreateModal(true)} 
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nouvelle Réunion
                </Button>
              )}

              {user?.role === 'Salarié·es SCC' && (
                <Link to="/admin">
                  <Button 
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Administration
                  </Button>
                </Link>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="flex items-center gap-2 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </Button>
            </div>
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-white rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Type :</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
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

            <div className="flex items-center gap-2">
              <Label htmlFor="show-past-meetings" className="text-sm font-medium">
                Réunions passées
              </Label>
              <Switch
                id="show-past-meetings"
                checked={showPastMeetings}
                onCheckedChange={setShowPastMeetings}
              />
            </div>
          </div>
        </div>

        {/* Liste des réunions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMeetings.map((meeting) => {
            const meetingType = getMeetingType(meeting.meetingTypeId);
            const isCompleted = meeting.status === 'completed';
            const isScheduled = meeting.status === 'scheduled';
            const isDraft = meeting.status === 'draft';

            return (
              <Card 
                key={meeting.id} 
                className={`hover:shadow-lg transition-shadow border-l-4 ${
                  isPastMeeting(meeting) ? 'opacity-75' : ''
                }`}
                style={{ 
                  borderLeftColor: meetingType?.color || '#6b7280'
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
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
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(meeting.date).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {meeting.time}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {meeting.description || "Aucune description disponible"}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {meeting.participants.length} participants
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {meeting.agendaItemsCount} points
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Badge variant={
                      isCompleted ? "default" : 
                      isScheduled ? "secondary" : 
                      "outline"
                    }>
                      {isCompleted ? "Terminée" : 
                       isScheduled ? "Programmée" : 
                       "Brouillon"}
                    </Badge>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <Link href={`/meeting/${meeting.id}`}>
                          <Eye className="w-4 h-4" />
                        </Link>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <Link href={`/presenter/${meeting.id}`}>
                          <Play className="w-4 h-4" />
                        </Link>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Formater les dates pour l'édition
                          const meetingDate = new Date(meeting.date);
                          const formattedMeeting = {
                            ...meeting,
                            date: meetingDate.toISOString().split('T')[0], // YYYY-MM-DD
                            time: meetingDate.toTimeString().slice(0, 5) // HH:MM
                          };
                          setEditingMeeting(formattedMeeting);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMeeting(meeting.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Modal de création */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">Nouvelle Réunion</h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Titre *</Label>
                  <Input
                    id="title"
                    value={newMeeting.title}
                    onChange={(e) => setNewMeeting({...newMeeting, title: e.target.value})}
                    placeholder="Titre de la réunion"
                  />
                </div>

                <div>
                  <Label htmlFor="meetingType">Type de réunion *</Label>
                  <Select 
                    value={newMeeting.meetingTypeId?.toString() || ""} 
                    onValueChange={(value) => setNewMeeting({...newMeeting, meetingTypeId: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un type" />
                    </SelectTrigger>
                    <SelectContent>
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
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newMeeting.date}
                      onChange={(e) => setNewMeeting({...newMeeting, date: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="time">Heure *</Label>
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
                    placeholder="Description de la réunion"
                    className="min-h-20"
                  />
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

        {/* Modal d'édition */}
        {editingMeeting && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">Modifier la réunion</h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-title">Titre *</Label>
                  <Input
                    id="edit-title"
                    value={editingMeeting.title}
                    onChange={(e) => setEditingMeeting({...editingMeeting, title: e.target.value})}
                    placeholder="Titre de la réunion"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-meetingType">Type de réunion *</Label>
                  <Select 
                    value={editingMeeting.meetingTypeId?.toString() || ""} 
                    onValueChange={(value) => setEditingMeeting({...editingMeeting, meetingTypeId: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un type" />
                    </SelectTrigger>
                    <SelectContent>
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
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-date">Date *</Label>
                    <Input
                      id="edit-date"
                      type="date"
                      value={editingMeeting.date}
                      onChange={(e) => setEditingMeeting({...editingMeeting, date: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-time">Heure *</Label>
                    <Input
                      id="edit-time"
                      type="time"
                      value={editingMeeting.time}
                      onChange={(e) => setEditingMeeting({...editingMeeting, time: e.target.value})}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editingMeeting.description}
                    onChange={(e) => setEditingMeeting({...editingMeeting, description: e.target.value})}
                    placeholder="Description de la réunion"
                    className="min-h-20"
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditingMeeting(null)}>
                    Annuler
                  </Button>
                  <Button onClick={() => updateMeeting(editingMeeting)}>
                    Sauvegarder
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