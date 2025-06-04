import { useState, useEffect } from 'react';
import { Clock, Users, CheckCircle, Circle, Play, Pause, SkipForward, Home, FileText, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { agendaItems, meetingInfo, type AgendaItem } from '@/data/agenda';
import { ParticipantsModal } from '@/components/ParticipantsModal';

export default function MeetingPresenter() {
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [itemStates, setItemStates] = useState<Record<string, { completed: boolean; notes: string; startTime?: Date; }>>({});
  const [meetingStartTime] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [itemStartTime, setItemStartTime] = useState<Date | null>(null);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentItem = agendaItems[currentItemIndex];
  const totalItems = agendaItems.length;
  const completedItems = Object.values(itemStates).filter(state => state.completed).length;
  const progress = (completedItems / totalItems) * 100;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const getMeetingDuration = () => {
    const diffMs = currentTime.getTime() - meetingStartTime.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `${hours}h${minutes.toString().padStart(2, '0')}`;
  };

  const getItemDuration = () => {
    if (!itemStartTime) return "00:00";
    const diffMs = currentTime.getTime() - itemStartTime.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const minutes = diffMinutes % 60;
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const startItem = () => {
    setIsTimerRunning(true);
    setItemStartTime(new Date());
  };

  const completeItem = () => {
    setItemStates(prev => ({
      ...prev,
      [currentItem.id]: {
        ...prev[currentItem.id],
        completed: true
      }
    }));
    setIsTimerRunning(false);
    setItemStartTime(null);
  };

  const nextItem = () => {
    if (currentItemIndex < agendaItems.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
      setIsTimerRunning(false);
      setItemStartTime(null);
    }
  };

  const previousItem = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
      setIsTimerRunning(false);
      setItemStartTime(null);
    }
  };

  const goToItem = (index: number) => {
    setCurrentItemIndex(index);
    setIsTimerRunning(false);
    setItemStartTime(null);
  };

  const getTypeColor = (type: AgendaItem['type']) => {
    switch (type) {
      case 'opening': return 'bg-blue-100 text-blue-800';
      case 'discussion': return 'bg-orange-100 text-orange-800';
      case 'decision': return 'bg-red-100 text-red-800';
      case 'information': return 'bg-green-100 text-green-800';
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
      case 'closing': return 'Clôture';
      default: return 'Autre';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nouvelle barre de navigation */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - Title */}
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-gray-900">{meetingInfo.title}</h1>
            </div>
            
            {/* Right side - Action buttons */}
            <div className="flex items-center space-x-3">
              {/* Home Button */}
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Accueil
              </Button>

              {/* Export PDF Button */}
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
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

      <div className="max-w-7xl mx-auto p-4">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contenu principal - Point actuel */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={getTypeColor(currentItem.type)}>
                        {getTypeLabel(currentItem.type)}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        Point {currentItemIndex + 1}/{totalItems}
                      </span>
                    </div>
                    <CardTitle className="text-xl">{currentItem.title}</CardTitle>
                    {currentItem.presenter && (
                      <p className="text-sm text-gray-600 mt-2">
                        Présentateur: {currentItem.presenter}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-mono font-bold text-blue-600">
                      {getItemDuration()}
                    </div>
                    {currentItem.duration && (
                      <div className="text-sm text-gray-500">
                        Durée prévue: {currentItem.duration}min
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Contrôles du chronomètre */}
                  <div className="flex gap-2">
                    {!isTimerRunning ? (
                      <Button onClick={startItem} className="flex items-center gap-2">
                        <Play className="w-4 h-4" />
                        Démarrer
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={() => setIsTimerRunning(false)} className="flex items-center gap-2">
                        <Pause className="w-4 h-4" />
                        Pause
                      </Button>
                    )}
                    
                    <Button 
                      onClick={completeItem}
                      variant="default"
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                      disabled={itemStates[currentItem.id]?.completed}
                    >
                      <CheckCircle className="w-4 h-4" />
                      {itemStates[currentItem.id]?.completed ? 'Terminé' : 'Marquer comme terminé'}
                    </Button>
                  </div>

                  {/* Navigation */}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={previousItem}
                      disabled={currentItemIndex === 0}
                    >
                      ← Précédent
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={nextItem}
                      disabled={currentItemIndex === agendaItems.length - 1}
                      className="flex items-center gap-2"
                    >
                      Suivant
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Zone de notes */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes du point
                    </label>
                    <textarea
                      className="w-full min-h-32 p-3 border border-gray-300 rounded-md resize-y"
                      placeholder="Ajoutez vos notes pour ce point..."
                      value={itemStates[currentItem.id]?.notes || ''}
                      onChange={(e) => setItemStates(prev => ({
                        ...prev,
                        [currentItem.id]: {
                          ...prev[currentItem.id],
                          notes: e.target.value
                        }
                      }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Ordre du jour */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg">Ordre du jour</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {agendaItems.map((item, index) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        index === currentItemIndex
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => goToItem(index)}
                      style={{ marginLeft: `${item.level * 16}px` }}
                    >
                      <div className="flex items-start gap-2">
                        {itemStates[item.id]?.completed ? (
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {item.title}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getTypeColor(item.type)}`}
                            >
                              {getTypeLabel(item.type)}
                            </Badge>
                            {item.duration && (
                              <span className="text-xs text-gray-500">
                                {item.duration}min
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Participants */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Participants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {meetingInfo.participants.map((participant, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 rounded bg-gray-50">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {participant.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <span className="text-sm">{participant}</span>
                    </div>
                  ))}
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