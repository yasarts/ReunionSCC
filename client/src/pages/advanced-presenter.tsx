import { useState, useEffect } from 'react';
import { Clock, Users, CheckCircle, Circle, Play, Pause, SkipForward, Plus, Edit3, Trash2, Coffee, Settings, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { agendaItems as initialAgenda, meetingInfo as initialMeetingInfo, type AgendaItem } from '@/data/agenda';

interface MeetingInfo {
  title: string;
  date: string;
  time: string;
  participants: string[];
  pouvoir: string;
}

export default function AdvancedMeetingPresenter() {
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [agenda, setAgenda] = useState<AgendaItem[]>(initialAgenda);
  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo>(initialMeetingInfo);
  const [itemStates, setItemStates] = useState<Record<string, { completed: boolean; notes: string; startTime?: Date; }>>({});
  const [meetingStartTime] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [itemStartTime, setItemStartTime] = useState<Date | null>(null);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isParticipantsDialogOpen, setIsParticipantsDialogOpen] = useState(false);
  const [newParticipant, setNewParticipant] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentItem = agenda[currentItemIndex];
  const totalItems = agenda.length;
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

  const calculateSchedule = () => {
    const startTime = new Date(`${meetingInfo.date} ${meetingInfo.time}`);
    let currentScheduleTime = new Date(startTime);
    
    return agenda.map(item => {
      const itemStartTime = new Date(currentScheduleTime);
      currentScheduleTime.setMinutes(currentScheduleTime.getMinutes() + item.duration);
      const itemEndTime = new Date(currentScheduleTime);
      
      return {
        ...item,
        startTime: formatTime(itemStartTime),
        endTime: formatTime(itemEndTime)
      };
    });
  };

  const scheduledAgenda = calculateSchedule();

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
    if (currentItemIndex < agenda.length - 1) {
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

  const addNewItem = (afterIndex: number, level: number = 0) => {
    const newId = Date.now().toString();
    const newItem: AgendaItem = {
      id: newId,
      title: 'Nouveau point',
      duration: 10,
      type: 'discussion',
      level,
      completed: false,
      content: '',
      visualLink: ''
    };
    
    const newAgenda = [...agenda];
    newAgenda.splice(afterIndex + 1, 0, newItem);
    setAgenda(newAgenda);
  };

  const addBreak = (afterIndex: number) => {
    const newId = Date.now().toString();
    const breakItem: AgendaItem = {
      id: newId,
      title: 'Pause',
      duration: 15,
      type: 'break',
      level: 0,
      completed: false,
      content: 'Pause de 15 minutes',
      visualLink: ''
    };
    
    const newAgenda = [...agenda];
    newAgenda.splice(afterIndex + 1, 0, breakItem);
    setAgenda(newAgenda);
  };

  const deleteItem = (id: string) => {
    setAgenda(agenda.filter(item => item.id !== id));
  };

  const updateItem = (updatedItem: AgendaItem) => {
    setAgenda(agenda.map(item => item.id === updatedItem.id ? updatedItem : item));
    setEditingItem(null);
    setIsEditDialogOpen(false);
  };

  const addParticipant = () => {
    if (newParticipant.trim()) {
      setMeetingInfo({
        ...meetingInfo,
        participants: [...meetingInfo.participants, newParticipant.trim()]
      });
      setNewParticipant('');
    }
  };

  const removeParticipant = (index: number) => {
    setMeetingInfo({
      ...meetingInfo,
      participants: meetingInfo.participants.filter((_, i) => i !== index)
    });
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

  const EditItemDialog = () => (
    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le point</DialogTitle>
        </DialogHeader>
        {editingItem && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={editingItem.title}
                onChange={(e) => setEditingItem({...editingItem, title: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Durée (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={editingItem.duration}
                  onChange={(e) => setEditingItem({...editingItem, duration: parseInt(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={editingItem.type}
                  onValueChange={(value: AgendaItem['type']) => setEditingItem({...editingItem, type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opening">Ouverture</SelectItem>
                    <SelectItem value="discussion">Discussion</SelectItem>
                    <SelectItem value="decision">Décision</SelectItem>
                    <SelectItem value="information">Information</SelectItem>
                    <SelectItem value="break">Pause</SelectItem>
                    <SelectItem value="closing">Clôture</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="presenter">Présentateur</Label>
              <Input
                id="presenter"
                value={editingItem.presenter || ''}
                onChange={(e) => setEditingItem({...editingItem, presenter: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="visualLink">Lien vers résumé visuel</Label>
              <Input
                id="visualLink"
                value={editingItem.visualLink || ''}
                onChange={(e) => setEditingItem({...editingItem, visualLink: e.target.value})}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label htmlFor="content">Contenu détaillé (Markdown)</Label>
              <Textarea
                id="content"
                value={editingItem.content || ''}
                onChange={(e) => setEditingItem({...editingItem, content: e.target.value})}
                className="min-h-32"
                placeholder="Vous pouvez utiliser la syntaxe Markdown ici..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={() => updateItem(editingItem)}>
                Sauvegarder
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  const ParticipantsDialog = () => (
    <Dialog open={isParticipantsDialogOpen} onOpenChange={setIsParticipantsDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gérer les participants</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="pouvoir">Pouvoirs</Label>
            <Textarea
              id="pouvoir"
              value={meetingInfo.pouvoir}
              onChange={(e) => setMeetingInfo({...meetingInfo, pouvoir: e.target.value})}
              className="min-h-20"
            />
          </div>
          
          <div>
            <Label>Participants</Label>
            <div className="space-y-2">
              {meetingInfo.participants.map((participant, index) => (
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
                  placeholder="Nom du nouveau participant"
                  onKeyPress={(e) => e.key === 'Enter' && addParticipant()}
                />
                <Button onClick={addParticipant}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="h-screen bg-gray-50 flex flex-col" style={{ aspectRatio: '16/9' }}>
      {/* En-tête compact pour 16/9 */}
      <div className="bg-white border-b p-3 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-blue-800">{meetingInfo.title}</h1>
            <span className="text-sm text-gray-600">{meetingInfo.date} - {formatTime(currentTime)}</span>
            <span className="text-sm text-gray-600">Durée: {getMeetingDuration()}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setIsParticipantsDialogOpen(true)}>
                  <Settings className="w-4 h-4" />
                </Button>
              </DialogTrigger>
            </Dialog>
            
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>{meetingInfo.participants.length}</span>
            </div>
            
            <div className="w-32">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>{completedItems}/{totalItems}</span>
              </div>
              <Progress value={progress} className="h-1" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Contenu principal - 70% */}
        <div className="flex-1 p-4 overflow-y-auto">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className={getTypeColor(currentItem.type)}>
                      {getTypeLabel(currentItem.type)}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      Point {currentItemIndex + 1}/{totalItems}
                    </span>
                    {scheduledAgenda[currentItemIndex] && (
                      <span className="text-sm text-blue-600 font-mono">
                        {scheduledAgenda[currentItemIndex].startTime} → {scheduledAgenda[currentItemIndex].endTime}
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-lg">{currentItem.title}</CardTitle>
                  {currentItem.presenter && (
                    <p className="text-sm text-gray-600 mt-1">
                      Présentateur: {currentItem.presenter}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xl font-mono font-bold text-blue-600">
                    {getItemDuration()}
                  </div>
                  <div className="text-sm text-gray-500">
                    Prévu: {currentItem.duration}min
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Contrôles */}
              <div className="flex gap-2 flex-wrap">
                {!isTimerRunning ? (
                  <Button onClick={startItem} size="sm" className="flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Démarrer
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setIsTimerRunning(false)} size="sm">
                    <Pause className="w-4 h-4" />
                    Pause
                  </Button>
                )}
                
                <Button 
                  onClick={completeItem}
                  variant="default"
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={itemStates[currentItem.id]?.completed}
                >
                  <CheckCircle className="w-4 h-4" />
                  {itemStates[currentItem.id]?.completed ? 'Terminé' : 'Terminer'}
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={previousItem}
                  disabled={currentItemIndex === 0}
                >
                  ← Précédent
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={nextItem}
                  disabled={currentItemIndex === agenda.length - 1}
                >
                  Suivant →
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingItem(currentItem);
                    setIsEditDialogOpen(true);
                  }}
                >
                  <Edit3 className="w-4 h-4" />
                  Modifier
                </Button>
              </div>

              {/* Lien visuel */}
              {currentItem.visualLink && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Link2 className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-600">Résumé visuel</span>
                  </div>
                  <a 
                    href={currentItem.visualLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    {currentItem.visualLink}
                  </a>
                </div>
              )}

              {/* Contenu détaillé */}
              {currentItem.content && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Contenu détaillé</h4>
                  <div className="text-sm whitespace-pre-wrap">{currentItem.content}</div>
                </div>
              )}

              {/* Zone de notes */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Notes du point</Label>
                <Textarea
                  className="mt-1 min-h-24"
                  placeholder="Ajoutez vos notes..."
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
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 30% */}
        <div className="w-80 border-l bg-white p-3 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Ordre du jour</h3>
            <div className="flex gap-1">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => addNewItem(currentItemIndex)}
              >
                <Plus className="w-3 h-3" />
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => addBreak(currentItemIndex)}
              >
                <Coffee className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-1">
            {scheduledAgenda.map((item, index) => (
              <div
                key={item.id}
                className={`p-2 rounded border cursor-pointer transition-colors text-xs ${
                  index === currentItemIndex
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => goToItem(index)}
                style={{ marginLeft: `${item.level * 8}px` }}
              >
                <div className="flex items-start gap-2">
                  {itemStates[item.id]?.completed ? (
                    <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <Circle className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-xs">{item.title}</div>
                    <div className="flex items-center justify-between mt-1">
                      <Badge 
                        variant="outline" 
                        className={`text-xs px-1 py-0 ${getTypeColor(item.type)}`}
                      >
                        {getTypeLabel(item.type)}
                      </Badge>
                      <div className="text-xs text-gray-500">
                        {item.startTime} ({item.duration}min)
                      </div>
                    </div>
                    <div className="flex justify-end mt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteItem(item.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <EditItemDialog />
      <ParticipantsDialog />
    </div>
  );
}