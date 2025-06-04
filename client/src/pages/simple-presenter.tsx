import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Clock, Users, CheckCircle, Circle, Play, Pause, SkipForward, Plus, Edit3, Trash2, Coffee, Settings, Link2, ChevronDown, ChevronUp, Home, FileDown, Move, Save, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { agendaItems as initialAgenda, meetingInfo as initialMeetingInfo, type AgendaItem } from '@/data/agenda';
import { ParticipantsModal } from '@/components/ParticipantsModal';

interface MeetingInfo {
  title: string;
  date: string;
  time: string;
  participants: string[];
  pouvoir: string;
}

export default function SimpleMeetingPresenter() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const meetingId = params.meetingId;
  
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [agenda, setAgenda] = useState<AgendaItem[]>(initialAgenda);
  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo>(initialMeetingInfo);
  const [itemStates, setItemStates] = useState<Record<string, { completed: boolean; notes: string; startTime?: Date; }>>({});
  const [meetingStartTime] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [itemStartTime, setItemStartTime] = useState<Date | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [newParticipant, setNewParticipant] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentItem = agenda[currentItemIndex];
  const totalItems = agenda.length;
  const completedItems = Object.values(itemStates).filter(state => state.completed).length;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDisplayDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getMeetingDuration = () => {
    const diff = currentTime.getTime() - meetingStartTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h${minutes.toString().padStart(2, '0')}`;
  };

  const exportToPDF = () => {
    window.print();
  };

  const getTypeColor = (type: AgendaItem['type']) => {
    switch (type) {
      case 'opening': return 'bg-blue-100 text-blue-800';
      case 'discussion': return 'bg-orange-100 text-orange-800';
      case 'decision': return 'bg-red-100 text-red-800';
      case 'information': return 'bg-green-100 text-green-800';
      case 'break': return 'bg-purple-100 text-purple-800';
      case 'closing': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: AgendaItem['type']) => {
    switch (type) {
      case 'opening': return 'Ouverture';
      case 'discussion': return 'Discussion';
      case 'decision': return 'Décision';
      case 'information': return 'Information';
      case 'break': return 'Pause';
      case 'closing': return 'Clôture';
      default: return 'Autre';
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col" style={{ aspectRatio: '16/9' }}>
      {/* Nouvelle barre de navigation */}
      <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - Title */}
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-gray-900">{meetingInfo.title}</h1>
            </div>
            
            {/* Right side - Action buttons */}
            <div className="flex items-center space-x-3">
              {/* Home Button */}
              <Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={() => setLocation('/')}>
                <Home className="h-4 w-4" />
                Accueil
              </Button>

              {/* Export PDF Button */}
              <Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={exportToPDF}>
                <FileText className="h-4 w-4" />
                Export PDF
              </Button>

              {/* Configuration Button */}
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configuration
              </Button>

              {/* Participants Button - Icon + Count */}
              <button
                onClick={() => setShowParticipantsModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Users className="h-5 w-5" />
                <span className="font-medium">{meetingInfo.participants.length}</span>
              </button>
            </div>
          </div>
          
          {/* Progress Bar - Below title */}
          <div className="pb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">
                Progression de la réunion
              </span>
              <span className="text-sm font-medium text-gray-900">
                {completedItems}/{totalItems} points traités
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Agenda */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Ordre du jour</h2>
            <div className="mt-2 text-sm text-gray-600">
              <div>Réunion: {formatDisplayDate(meetingInfo.date)}</div>
              <div>Heure: {formatTime(currentTime)}</div>
              <div>Durée: {getMeetingDuration()}</div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {agenda.map((item, index) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    index === currentItemIndex
                      ? 'bg-blue-50 border-blue-300'
                      : itemStates[item.id]?.completed
                      ? 'bg-green-50 border-green-300'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setCurrentItemIndex(index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {itemStates[item.id]?.completed ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : index === currentItemIndex ? (
                        <Play className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="font-medium text-sm">{item.title}</span>
                    </div>
                    <Badge variant="outline" className={getTypeColor(item.type)}>
                      {getTypeLabel(item.type)}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {item.duration} min
                    {item.presenter && ` • ${item.presenter}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main presentation area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Secondary header with controls */}
          <div className="bg-white border-b p-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentItemIndex(Math.max(0, currentItemIndex - 1))}
                  disabled={currentItemIndex === 0}
                >
                  <SkipForward className="w-4 h-4 rotate-180" />
                  Précédent
                </Button>
                
                <div className="text-sm font-medium">
                  {currentItemIndex + 1} / {totalItems}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentItemIndex(Math.min(totalItems - 1, currentItemIndex + 1))}
                  disabled={currentItemIndex === totalItems - 1}
                >
                  Suivant
                  <SkipForward className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant={isTimerRunning ? "destructive" : "default"}
                  size="sm"
                  onClick={() => {
                    setIsTimerRunning(!isTimerRunning);
                    if (!isTimerRunning) {
                      setItemStartTime(new Date());
                    }
                  }}
                >
                  {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isTimerRunning ? 'Pause' : 'Démarrer'}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (currentItem) {
                      setItemStates({
                        ...itemStates,
                        [currentItem.id]: {
                          ...itemStates[currentItem.id],
                          completed: !itemStates[currentItem.id]?.completed
                        }
                      });
                    }
                  }}
                >
                  {itemStates[currentItem?.id]?.completed ? (
                    <>
                      <Circle className="w-4 h-4" />
                      Marquer non terminé
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Marquer terminé
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Main content display */}
          <div className="flex-1 overflow-y-auto">
            {currentItem ? (
              <div className="p-8">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-2xl">{currentItem.title}</CardTitle>
                      <Badge className={getTypeColor(currentItem.type)}>
                        {getTypeLabel(currentItem.type)}
                      </Badge>
                    </div>
                    {currentItem.presenter && (
                      <p className="text-gray-600">Présenté par: {currentItem.presenter}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {currentItem.content && (
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Contenu</h3>
                          <div className="prose prose-gray max-w-none">
                            <p className="whitespace-pre-wrap">{currentItem.content}</p>
                          </div>
                        </div>
                      )}
                      
                      {currentItem.visualLink && (
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Résumé visuel</h3>
                          <Button
                            variant="outline"
                            onClick={() => window.open(currentItem.visualLink, '_blank')}
                            className="flex items-center gap-2"
                          >
                            <Link2 className="w-4 h-4" />
                            Ouvrir le résumé visuel
                          </Button>
                        </div>
                      )}
                      
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Durée prévue</h3>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{currentItem.duration} minutes</span>
                        </div>
                      </div>
                      
                      {itemStates[currentItem.id]?.notes && (
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Notes</h3>
                          <p className="text-gray-700 bg-gray-50 p-3 rounded">
                            {itemStates[currentItem.id].notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <p>Aucun élément sélectionné</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal des participants */}
      <ParticipantsModal
        isOpen={showParticipantsModal}
        onClose={() => setShowParticipantsModal(false)}
        meetingId={1} // ID fixe pour la démonstration
        meetingTitle={meetingInfo.title}
      />
    </div>
  );
}