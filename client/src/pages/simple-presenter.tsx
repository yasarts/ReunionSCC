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
  
  const [currentItemIndex, setCurrentItemIndex] = useState(-1);
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [editedDuration, setEditedDuration] = useState(0);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemType, setNewItemType] = useState<'section' | 'subsection' | 'break'>('section');
  const [selectedParentId, setSelectedParentId] = useState<string>('');

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

  // Générer un menu automatique pour les sections avec sous-sections
  const generateSectionMenu = (item: AgendaItem) => {
    if (!item.content) return null;
    
    // Détecter les sous-sections dans le contenu (titre avec ":" ou numérotées)
    const subsections = item.content.split('\n')
      .filter(line => line.trim())
      .filter(line => 
        line.includes(':') || 
        /^\d+\./.test(line.trim()) ||
        /^[A-Z]\./.test(line.trim()) ||
        /^-/.test(line.trim())
      )
      .slice(0, 8); // Limiter à 8 sous-sections max

    if (subsections.length <= 1) return null;

    return (
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">Menu de navigation</h4>
        <div className="space-y-1">
          {subsections.map((subsection, index) => (
            <button
              key={index}
              className="block w-full text-left text-sm text-blue-700 hover:text-blue-900 hover:bg-blue-100 p-1 rounded transition-colors"
              onClick={() => {
                // Scroll vers la section correspondante ou mettre en évidence
                const element = document.getElementById(`subsection-${index}`);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              {subsection.trim().substring(0, 80)}
              {subsection.length > 80 ? '...' : ''}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Formater le contenu avec des ancres pour la navigation et support markdown
  const formatContentWithAnchors = (content: string) => {
    if (!content) return content;
    
    let formattedContent = content;
    let subsectionIndex = 0;
    
    // Support basique du markdown
    formattedContent = formattedContent
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>');
    
    const lines = formattedContent.split('\n');
    formattedContent = '';
    
    for (const line of lines) {
      if (line.includes(':') || 
          /^\d+\./.test(line.trim()) ||
          /^[A-Z]\./.test(line.trim()) ||
          /^-/.test(line.trim())) {
        formattedContent += `<div id="subsection-${subsectionIndex}" class="font-semibold mt-4 mb-2 text-lg">${line}</div>\n`;
        subsectionIndex++;
      } else {
        formattedContent += line + '\n';
      }
    }
    
    return formattedContent;
  };

  // Calculer les horaires prévisionnels
  const calculateScheduledTimes = () => {
    const startTime = new Date(`${meetingInfo.date} ${meetingInfo.time}`);
    let currentTime = new Date(startTime);
    
    return agenda.map((item, index) => {
      const scheduledStart = new Date(currentTime);
      currentTime = new Date(currentTime.getTime() + item.duration * 60000);
      return {
        ...item,
        scheduledStart: scheduledStart.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        scheduledEnd: currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      };
    });
  };

  // Numéroter automatiquement les sections et sous-sections
  const getItemNumber = (item: AgendaItem, index: number) => {
    if (item.level === 0) {
      // Section principale
      const sectionIndex = agenda.filter(a => a.level === 0).findIndex(a => a.id === item.id) + 1;
      return `${sectionIndex}.`;
    } else {
      // Sous-section
      const parentIndex = agenda.slice(0, index).filter(a => a.level === 0).length;
      const subsectionIndex = agenda.slice(0, index + 1).filter(a => a.level === item.level && agenda.slice(0, agenda.findIndex(b => b.id === a.id)).filter(b => b.level === 0).length === parentIndex).length;
      return `${parentIndex}.${subsectionIndex}`;
    }
  }

  // Fonction pour obtenir toutes les sections parentes (niveau 0)
  const getParentSections = () => {
    return agenda.filter(item => item.level === 0 && item.type !== 'break');
  };

  // Fonction pour déplacer un élément et ses sous-éléments
  const moveItemWithChildren = (fromIndex: number, toIndex: number) => {
    const newAgenda = [...agenda];
    const itemToMove = newAgenda[fromIndex];
    
    if (itemToMove.level === 0) {
      // Si c'est une section, on déplace aussi toutes ses sous-sections
      const childItems = [];
      let i = fromIndex + 1;
      while (i < newAgenda.length && newAgenda[i].level > itemToMove.level) {
        childItems.push(newAgenda[i]);
        i++;
      }
      
      // Supprimer l'élément et ses enfants de leur position actuelle
      newAgenda.splice(fromIndex, 1 + childItems.length);
      
      // Insérer à la nouvelle position
      const adjustedToIndex = toIndex > fromIndex ? toIndex - (1 + childItems.length) : toIndex;
      newAgenda.splice(adjustedToIndex, 0, itemToMove, ...childItems);
    } else {
      // Pour les sous-sections, déplacement simple
      const [movedItem] = newAgenda.splice(fromIndex, 1);
      newAgenda.splice(toIndex, 0, movedItem);
    }
    
    setAgenda(newAgenda);
  };

  // Fonction pour ajouter un nouvel élément
  const addNewItem = (title: string, duration: number, type: 'section' | 'subsection' | 'break', parentId?: string) => {
    const newItem: AgendaItem = {
      id: `item-${Date.now()}`,
      title: title,
      duration: duration,
      type: type === 'break' ? 'break' : 'discussion',
      level: type === 'subsection' ? 1 : 0,
      completed: false,
      content: "",
      parentSectionId: parentId
    };

    const newAgenda = [...agenda];
    
    if (type === 'subsection' && parentId) {
      // Insérer après la dernière sous-section de la section parente
      const parentIndex = newAgenda.findIndex(item => item.id === parentId);
      let insertIndex = parentIndex + 1;
      
      // Trouver la position après toutes les sous-sections existantes
      while (insertIndex < newAgenda.length && newAgenda[insertIndex].level > 0) {
        insertIndex++;
      }
      
      newAgenda.splice(insertIndex, 0, newItem);
    } else {
      // Ajouter à la fin pour les sections et pauses
      newAgenda.push(newItem);
    }
    
    setAgenda(newAgenda);
    setShowAddItemModal(false);
  };;

  // Ajouter une pause
  const addBreak = (afterIndex: number) => {
    const breakItem: AgendaItem = {
      id: `break-${Date.now()}`,
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

  // Glisser-déposer
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedItem) return;

    const draggedIndex = agenda.findIndex(item => item.id === draggedItem);
    if (draggedIndex === -1 || draggedIndex === targetIndex) return;

    const newAgenda = [...agenda];
    const draggedItemData = newAgenda[draggedIndex];
    
    // Si on déplace une section, déplacer aussi ses sous-sections
    if (draggedItemData.level === 0) {
      const subsections: AgendaItem[] = [];
      let i = draggedIndex + 1;
      while (i < newAgenda.length && newAgenda[i].level > 0) {
        subsections.push(newAgenda[i]);
        i++;
      }
      
      // Supprimer la section et ses sous-sections
      newAgenda.splice(draggedIndex, 1 + subsections.length);
      
      // Réinsérer à la nouvelle position
      const insertIndex = targetIndex > draggedIndex ? targetIndex - subsections.length : targetIndex;
      newAgenda.splice(insertIndex, 0, draggedItemData, ...subsections);
    } else {
      // Déplacer seulement la sous-section
      newAgenda.splice(draggedIndex, 1);
      const insertIndex = targetIndex > draggedIndex ? targetIndex - 1 : targetIndex;
      newAgenda.splice(insertIndex, 0, draggedItemData);
    }

    setAgenda(newAgenda);
    setDraggedItem(null);
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
              <Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={() => setShowEditModal(true)}>
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
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Ordre du jour</h2>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsEditMode(!isEditMode)}
                className="flex items-center gap-1"
              >
                <Edit3 className="h-3 w-3" />
                {isEditMode ? 'Terminer' : 'Modifier'}
              </Button>
            </div>
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
                  <div className="mt-1 text-xs text-gray-500 flex items-center gap-2">
                    {isEditMode ? (
                      <input
                        type="number"
                        value={item.duration}
                        onChange={(e) => {
                          const newAgenda = [...agenda];
                          const itemIndex = newAgenda.findIndex(a => a.id === item.id);
                          if (itemIndex !== -1) {
                            newAgenda[itemIndex].duration = parseInt(e.target.value) || 0;
                            setAgenda(newAgenda);
                          }
                        }}
                        className="w-12 px-1 py-0.5 text-xs border rounded"
                        min="0"
                      />
                    ) : (
                      <span 
                        className="cursor-pointer hover:bg-gray-100 px-1 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditingDuration(true);
                          setEditedDuration(item.duration);
                        }}
                      >
                        {item.duration} min
                      </span>
                    )}
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
                  onClick={() => setCurrentItemIndex(Math.max(-1, currentItemIndex - 1))}
                  disabled={currentItemIndex === -1}
                >
                  <SkipForward className="w-4 h-4 rotate-180" />
                  Précédent
                </Button>
                
                <div className="text-sm font-medium">
                  {currentItemIndex === -1 ? "Aperçu" : `${currentItemIndex + 1} / ${totalItems}`}
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
            {currentItemIndex === -1 ? (
              // Page d'aperçu automatique de l'ordre du jour
              <div className="p-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl">Ordre du jour - Aperçu général</CardTitle>
                    <p className="text-gray-600">{meetingInfo.title} - {formatDisplayDate(meetingInfo.date)}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {calculateScheduledTimes().map((item, index) => (
                        <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {getItemNumber(item, index)} {item.title}
                              </span>
                              <Badge variant={item.type === 'break' ? 'secondary' : 'outline'} className="text-xs">
                                {getTypeLabel(item.type)}
                              </Badge>
                            </div>
                            {item.presenter && (
                              <p className="text-xs text-gray-500 mt-1">Présenté par: {item.presenter}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{item.scheduledStart} - {item.scheduledEnd}</div>
                            <div className="text-xs text-gray-500">{item.duration} min</div>
                          </div>
                        </div>
                      ))}
                      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <div className="text-sm text-blue-800">
                          <strong>Durée totale estimée:</strong> {getMeetingDuration()}
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          Fin prévue: {(() => {
                            const totalDuration = agenda.reduce((acc, item) => acc + item.duration, 0);
                            const endTime = new Date(`${meetingInfo.date} ${meetingInfo.time}`);
                            endTime.setMinutes(endTime.getMinutes() + totalDuration);
                            return endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                          })()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : currentItem ? (
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
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold">Contenu</h3>
                          <button
                            onClick={() => {
                              setIsEditingContent(true);
                              setEditedContent(currentItem.content || '');
                            }}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Modifier le contenu"
                          >
                            <Edit3 className="h-4 w-4 text-gray-600" />
                          </button>
                        </div>
                        {isEditingContent ? (
                          <div className="space-y-2">
                            <div className="text-xs text-gray-500 mb-2">
                              Support Markdown: **gras**, *italique*, `code`, - listes
                            </div>
                            <textarea
                              value={editedContent}
                              onChange={(e) => setEditedContent(e.target.value)}
                              className="w-full h-32 p-2 border rounded-md resize-none font-mono text-sm"
                              placeholder="Contenu de l'élément (support Markdown)..."
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  const updatedAgenda = agenda.map(item => 
                                    item.id === currentItem.id 
                                      ? { ...item, content: editedContent }
                                      : item
                                  );
                                  setAgenda(updatedAgenda);
                                  setIsEditingContent(false);
                                }}
                              >
                                Sauvegarder
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsEditingContent(false)}
                              >
                                Annuler
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {generateSectionMenu(currentItem)}
                            <div className="prose prose-gray max-w-none">
                              <div 
                                className="whitespace-pre-wrap"
                                dangerouslySetInnerHTML={{ 
                                  __html: formatContentWithAnchors(currentItem.content || 'Aucun contenu défini')
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
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
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold">Durée prévue</h3>
                          <button
                            onClick={() => {
                              setIsEditingDuration(true);
                              setEditedDuration(currentItem.duration);
                            }}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Modifier la durée"
                          >
                            <Edit3 className="h-4 w-4 text-gray-600" />
                          </button>
                        </div>
                        {isEditingDuration ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <input
                                type="number"
                                value={editedDuration}
                                onChange={(e) => setEditedDuration(parseInt(e.target.value) || 0)}
                                className="w-20 p-1 border rounded text-center"
                                min="1"
                                max="240"
                              />
                              <span>minutes</span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  const updatedAgenda = agenda.map(item => 
                                    item.id === currentItem.id 
                                      ? { ...item, duration: editedDuration }
                                      : item
                                  );
                                  setAgenda(updatedAgenda);
                                  setIsEditingDuration(false);
                                }}
                              >
                                Sauvegarder
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsEditingDuration(false)}
                              >
                                Annuler
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span 
                              className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                              onClick={() => {
                                setIsEditingDuration(true);
                                setEditedDuration(currentItem.duration);
                              }}
                              title="Cliquer pour modifier"
                            >
                              {currentItem.duration} minutes
                            </span>
                          </div>
                        )}
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