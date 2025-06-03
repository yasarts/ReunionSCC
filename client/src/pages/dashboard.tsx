import { useState } from 'react';
import { useLocation } from 'wouter';
import { Plus, Calendar, Users, Clock, Play, Edit3, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [meetings, setMeetings] = useState<Meeting[]>([
    {
      id: 'conseil-national-2025',
      title: 'Conseil National SCC 2025-06-05',
      date: '2025-06-05',
      time: '14:00',
      description: 'Assemblée Générale Extraordinaire du Conseil National',
      participants: [
        'Président du Conseil',
        'Vice-Président',
        'Secrétaire Général',
        'Trésorier',
        'Responsable Pôle Formation',
        'Responsable Pôle Production'
      ],
      pouvoir: 'Pouvoir donné par Mme Martin à M. Dupont pour représentation aux votes',
      status: 'scheduled',
      agendaItemsCount: 12,
      totalDuration: 180,
      createdAt: '2024-12-01'
    }
  ]);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  const deleteMeeting = (id: string) => {
    setMeetings(meetings.filter(m => m.id !== id));
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
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nouvelle Réunion
          </Button>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Réunions</p>
                  <p className="text-2xl font-bold">{meetings.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Planifiées</p>
                  <p className="text-2xl font-bold">{meetings.filter(m => m.status === 'scheduled').length}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">En Cours</p>
                  <p className="text-2xl font-bold">{meetings.filter(m => m.status === 'in_progress').length}</p>
                </div>
                <Play className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Terminées</p>
                  <p className="text-2xl font-bold">{meetings.filter(m => m.status === 'completed').length}</p>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des réunions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {meetings.map((meeting) => (
            <Card key={meeting.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{meeting.title}</CardTitle>
                    <Badge className={getStatusColor(meeting.status)}>
                      {getStatusLabel(meeting.status)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{meeting.date} à {meeting.time}</span>
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
                    onClick={() => setLocation(`/presenter/${meeting.id}`)}
                    className="flex-1"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Présenter
                  </Button>
                  
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
                </div>
              </CardContent>
            </Card>
          ))}
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