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

      {/* Content area with proper structure */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {/* Contenu principal de la présentation */}
          <div className="p-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{currentItem?.title || 'Aucun élément'}</span>
                  <Badge variant="outline">{currentItem?.type}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{currentItem?.content || 'Aucun contenu'}</p>
                
                <div className="flex items-center justify-between">
                  <Button 
                    onClick={() => setCurrentItemIndex(Math.max(0, currentItemIndex - 1))}
                    disabled={currentItemIndex === 0}
                  >
                    Précédent
                  </Button>
                  
                  <span className="text-sm text-gray-500">
                    {currentItemIndex + 1} / {totalItems}
                  </span>
                  
                  <Button 
                    onClick={() => setCurrentItemIndex(Math.min(totalItems - 1, currentItemIndex + 1))}
                    disabled={currentItemIndex === totalItems - 1}
                  >
                    Suivant
                  </Button>
                </div>
              </CardContent>
            </Card>
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