import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Clock, Users, CheckCircle, Circle, Play, Pause, SkipForward, Plus, Edit3, Trash2, Coffee, Settings, Link2, ChevronDown, ChevronUp, Home, FileDown, Move, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { agendaItems as initialAgenda, meetingInfo as initialMeetingInfo, type AgendaItem } from '@/data/agenda';

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
  const progress = (completedItems / totalItems) * 100;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  // Fonction d'export PDF
  const exportToPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    // Configuration PDF
    doc.setFont("helvetica");
    
    // En-tête
    doc.setFontSize(20);
    doc.text(meetingInfo.title, 20, 30);
    doc.setFontSize(12);
    doc.text(`Date: ${meetingInfo.date} à ${meetingInfo.time}`, 20, 45);
    doc.text(`Participants: ${meetingInfo.participants.length}`, 20, 55);
    
    // Ordre du jour
    doc.setFontSize(16);
    doc.text("ORDRE DU JOUR", 20, 75);
    
    let yPosition = 90;
    const totalDuration = agenda.reduce((sum, item) => sum + item.duration, 0);
    
    doc.setFontSize(10);
    doc.text(`Durée totale prévue: ${Math.floor(totalDuration / 60)}h${(totalDuration % 60).toString().padStart(2, '0')}`, 20, yPosition);
    yPosition += 15;
    
    agenda.forEach((item, index) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 30;
      }
      
      doc.setFontSize(12);
      doc.text(`${index + 1}. ${item.title}`, 20, yPosition);
      yPosition += 7;
      
      doc.setFontSize(10);
      doc.text(`   Durée: ${item.duration}min | Type: ${getTypeLabel(item.type)}`, 25, yPosition);
      if (item.presenter) {
        yPosition += 7;
        doc.text(`   Intervenant: ${item.presenter}`, 25, yPosition);
      }
      if (item.content) {
        yPosition += 7;
        const lines = doc.splitTextToSize(`   ${item.content}`, 160);
        doc.text(lines, 25, yPosition);
        yPosition += lines.length * 5;
      }
      yPosition += 10;
    });
    
    // Sauvegarde
    doc.save(`ordre-du-jour-${meetingInfo.title.replace(/\s+/g, '-')}.pdf`);
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
      
      // Calculer la durée effective (cumul des sous-points si applicable)
      let effectiveDuration = item.duration;
      if (item.level === 0) {
        // Pour les points principaux, calculer le total des sous-points
        const subItems = agenda.filter(subItem => 
          subItem.level > 0 && 
          agenda.indexOf(subItem) > agenda.indexOf(item) &&
          (agenda.findIndex((nextMain, idx) => idx > agenda.indexOf(item) && nextMain.level === 0) === -1 ||
           agenda.indexOf(subItem) < agenda.findIndex((nextMain, idx) => idx > agenda.indexOf(item) && nextMain.level === 0))
        );
        
        if (subItems.length > 0) {
          effectiveDuration = subItems.reduce((total, subItem) => total + subItem.duration, 0);
        }
      }
      
      currentScheduleTime.setMinutes(currentScheduleTime.getMinutes() + (item.level === 0 ? effectiveDuration : item.duration));
      const itemEndTime = new Date(currentScheduleTime);
      
      return {
        ...item,
        startTime: formatTime(itemStartTime),
        endTime: formatTime(itemEndTime),
        effectiveDuration,
        subItems: item.level === 0 ? agenda.filter(subItem => 
          subItem.level > 0 && 
          agenda.indexOf(subItem) > agenda.indexOf(item) &&
          (agenda.findIndex((nextMain, idx) => idx > agenda.indexOf(item) && nextMain.level === 0) === -1 ||
           agenda.indexOf(subItem) < agenda.findIndex((nextMain, idx) => idx > agenda.indexOf(item) && nextMain.level === 0))
        ) : []
      };
    });
  };

  const scheduledAgenda = calculateSchedule();

  const startItem = () => {
    setIsTimerRunning(true);
    setItemStartTime(new Date());
  };

  const toggleItemCompletion = () => {
    const isCurrentlyCompleted = itemStates[currentItem.id]?.completed;
    setItemStates(prev => ({
      ...prev,
      [currentItem.id]: {
        ...prev[currentItem.id],
        completed: !isCurrentlyCompleted
      }
    }));
    if (!isCurrentlyCompleted) {
      setIsTimerRunning(false);
      setItemStartTime(null);
    }
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
      title: level === 0 ? 'Nouveau point principal' : 'Nouveau sous-point',
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

  const addSubItem = (parentIndex: number) => {
    addNewItem(parentIndex, 1);
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
    setShowEditModal(false);
  };

  // Fonction pour obtenir l'ID de la section parente d'une sous-section
  const getParentSectionId = (subsectionId: string): string => {
    const subsectionIndex = agenda.findIndex(item => item.id === subsectionId);
    if (subsectionIndex === -1) return '';
    
    // Chercher la section parente (level 0) qui précède cette sous-section
    for (let i = subsectionIndex - 1; i >= 0; i--) {
      if (agenda[i].level === 0 && agenda[i].type !== 'break') {
        return agenda[i].id;
      }
    }
    return '';
  };

  // Fonction pour déplacer une sous-section vers une autre section
  const moveSubsectionToSection = (subsectionId: string, newParentId: string) => {
    const subsectionIndex = agenda.findIndex(item => item.id === subsectionId);
    const newParentIndex = agenda.findIndex(item => item.id === newParentId);
    
    if (subsectionIndex === -1 || newParentIndex === -1) return;
    
    const subsection = agenda[subsectionIndex];
    const newAgenda = [...agenda];
    
    // Retirer la sous-section de sa position actuelle
    newAgenda.splice(subsectionIndex, 1);
    
    // Trouver la position d'insertion après la nouvelle section parente
    const adjustedParentIndex = subsectionIndex < newParentIndex ? newParentIndex - 1 : newParentIndex;
    let insertIndex = adjustedParentIndex + 1;
    
    // Trouver la fin des sous-sections existantes de la nouvelle section parente
    while (insertIndex < newAgenda.length && newAgenda[insertIndex].level > 0) {
      insertIndex++;
    }
    
    // Insérer la sous-section à la nouvelle position
    newAgenda.splice(insertIndex, 0, subsection);
    
    // Renuméroter tous les éléments
    const renumberedAgenda = renumberAgenda(newAgenda);
    setAgenda(renumberedAgenda);
  };

  // Fonctions de glisser-déplacer et re-numérotation
  const renumberAgenda = (newAgenda: AgendaItem[]) => {
    let sectionCount = 0;
    const renumbered = newAgenda.map((item, index) => {
      if (index === 0 && item.id === "timeline") {
        return item; // Ne pas modifier la timeline
      }
      
      if (item.level === 0) {
        sectionCount++;
        return {
          ...item,
          title: item.title.replace(/^\d+\.?\s*/, `${sectionCount}. `)
        };
      } else if (item.level === 1) {
        // Trouver la section parente
        let subSectionCount = 0;
        for (let i = index - 1; i >= 0; i--) {
          if (newAgenda[i].level === 0) break;
          if (newAgenda[i].level === 1) subSectionCount++;
        }
        return {
          ...item,
          title: item.title.replace(/^\d+\.\d+\.?\s*/, `${sectionCount}.${subSectionCount + 1} `)
        };
      }
      return item;
    });
    return renumbered;
  };

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
    if (!draggedItem || !isEditMode) return;

    const draggedIndex = agenda.findIndex(item => item.id === draggedItem);
    if (draggedIndex === -1 || draggedIndex === targetIndex) return;

    const newAgenda = [...agenda];
    const draggedElement = newAgenda[draggedIndex];
    
    // Si on déplace une section (level 0), on doit déplacer toutes ses sous-sections aussi
    if (draggedElement.level === 0) {
      // Trouver toutes les sous-sections qui suivent cette section
      const elementsToMove = [draggedElement];
      for (let i = draggedIndex + 1; i < newAgenda.length; i++) {
        if (newAgenda[i].level === 0) break; // On s'arrête à la prochaine section
        if (newAgenda[i].level === 1) {
          elementsToMove.push(newAgenda[i]);
        }
      }
      
      // Supprimer tous les éléments à déplacer
      elementsToMove.forEach(() => {
        const index = newAgenda.findIndex(item => item.id === elementsToMove[0].id);
        if (index !== -1) newAgenda.splice(index, 1);
      });
      
      // Ajuster l'index cible si nécessaire
      let adjustedTargetIndex = targetIndex;
      if (targetIndex > draggedIndex) {
        adjustedTargetIndex -= elementsToMove.length;
      }
      
      // Insérer tous les éléments à la nouvelle position
      elementsToMove.forEach((element, idx) => {
        newAgenda.splice(adjustedTargetIndex + idx, 0, element);
      });
    } else {
      // Déplacement simple pour les sous-sections
      const draggedElement = newAgenda.splice(draggedIndex, 1)[0];
      newAgenda.splice(targetIndex, 0, draggedElement);
    }

    const renumberedAgenda = renumberAgenda(newAgenda);
    setAgenda(renumberedAgenda);
    setDraggedItem(null);
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

  return (
    <div className="h-screen bg-gray-50 flex flex-col" style={{ aspectRatio: '16/9' }}>
      {/* En-tête compact pour 16/9 */}
      <div className="bg-white border-b p-3 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-blue-800">{meetingInfo.title}</h1>
              {/* Barre de progression colorée */}
              <div className="mt-1">
                <div className="flex items-center gap-2">
                  <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 via-green-500 to-blue-600 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600">{completedItems}/{totalItems}</span>
                </div>
              </div>
            </div>
            <span className="text-sm text-gray-600">{meetingInfo.date} - {formatTime(currentTime)}</span>
            <span className="text-sm text-gray-600">Durée: {getMeetingDuration()}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation('/')}
            >
              <Home className="w-4 h-4" />
              Accueil
            </Button>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportToPDF}
            >
              <FileDown className="w-4 h-4" />
              Export PDF
            </Button>


            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowParticipantsModal(true)}
            >
              <Settings className="w-4 h-4" />
            </Button>
            
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
                  onClick={toggleItemCompletion}
                  variant={itemStates[currentItem.id]?.completed ? "outline" : "default"}
                  size="sm"
                  className={itemStates[currentItem.id]?.completed ? 
                    "border-green-600 text-green-600 hover:bg-green-50" : 
                    "bg-green-600 hover:bg-green-700"
                  }
                >
                  <CheckCircle className="w-4 h-4" />
                  {itemStates[currentItem.id]?.completed ? 'Marquer non terminé' : 'Terminer'}
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
                    setShowEditModal(true);
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

              {/* Affichage des sous-points pour les points principaux */}
              {currentItem.level === 0 && scheduledAgenda[currentItemIndex].subItems.length > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-3 text-blue-800">Sous-points de ce point principal</h4>
                  <div className="space-y-2">
                    {scheduledAgenda[currentItemIndex].subItems.map((subItem, idx) => (
                      <div key={subItem.id} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{subItem.title}</div>
                          <Badge variant="outline" className={`text-xs mt-1 ${getTypeColor(subItem.type)}`}>
                            {getTypeLabel(subItem.type)}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500">
                          {subItem.duration}min
                        </div>
                      </div>
                    ))}
                    <div className="mt-2 p-2 bg-blue-100 rounded text-sm font-medium text-blue-800">
                      Durée totale: {scheduledAgenda[currentItemIndex].effectiveDuration}min
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline complète pour le premier point d'ordre du jour */}
              {currentItem.id === "timeline" && (
                <div className="h-full flex flex-col">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-blue-800 mb-2">Timeline complète de la réunion</h2>
                    <div className="flex justify-center gap-8 text-sm text-gray-600">
                      <span>Durée totale: <strong className="text-blue-800">{Math.floor(agenda.reduce((sum, item) => sum + item.duration, 0) / 60)}h{(agenda.reduce((sum, item) => sum + item.duration, 0) % 60).toString().padStart(2, '0')}</strong></span>
                      <span>Progression: <strong className="text-blue-800">{completedItems}/{totalItems} points ({Math.round(progress)}%)</strong></span>
                    </div>
                  </div>
                  
                  <div className="flex-1 grid grid-cols-1 gap-2">
                    {agenda.slice(1).map((item, index) => {
                      const actualIndex = index + 1; // +1 car on skip le premier item (timeline)
                      const isCompleted = itemStates[item.id]?.completed;
                      const isCurrent = actualIndex === currentItemIndex;
                      
                      // Génération de la numérotation automatique
                      let sectionNumber = '';
                      if (item.level === 0) {
                        // Compter les sections principales précédentes
                        const previousMainSections = agenda.slice(1, actualIndex).filter(i => i.level === 0).length;
                        sectionNumber = `${previousMainSections + 1}.`;
                      } else if (item.level === 1) {
                        // Trouver la section principale parente
                        let parentSectionNum = 0;
                        let subSectionNum = 0;
                        for (let i = 1; i < actualIndex; i++) {
                          if (agenda[i].level === 0) {
                            parentSectionNum++;
                            subSectionNum = 0;
                          } else if (agenda[i].level === 1) {
                            subSectionNum++;
                          }
                        }
                        sectionNumber = `${parentSectionNum}.${subSectionNum + 1}`;
                      }
                      
                      return (
                        <div 
                          key={item.id} 
                          className={`p-3 rounded-lg border-l-4 transition-all ${
                            isCurrent ? 'bg-blue-100 border-l-blue-500 shadow-md' :
                            isCompleted ? 'bg-green-50 border-l-green-500' :
                            'bg-white border-l-gray-300 hover:bg-gray-50'
                          } ${item.level === 1 ? 'ml-6' : ''}`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                {isCompleted ? (
                                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                ) : isCurrent ? (
                                  <Play className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                ) : (
                                  <Circle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                )}
                                
                                <span className={`font-bold text-sm ${
                                  isCurrent ? 'text-blue-800' : 'text-gray-600'
                                }`}>
                                  {sectionNumber}
                                </span>
                                
                                <span className={`font-medium ${
                                  item.level === 0 ? 'text-base' : 'text-sm'
                                } ${
                                  isCurrent ? 'text-blue-800' : 
                                  isCompleted ? 'text-green-800' : 
                                  'text-gray-800'
                                }`}>
                                  {item.title.replace(/^\d+\.\s*/, '')}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-3 ml-7">
                                <Badge variant="outline" className={`text-xs ${getTypeColor(item.type)}`}>
                                  {getTypeLabel(item.type)}
                                </Badge>
                                
                                {item.presenter && (
                                  <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                    {item.presenter}
                                  </span>
                                )}
                                
                                {scheduledAgenda[actualIndex] && (
                                  <span className="text-xs text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded">
                                    {scheduledAgenda[actualIndex].startTime}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-right flex-shrink-0 ml-4">
                              <div className={`text-sm font-mono font-bold ${
                                isCurrent ? 'text-blue-600' : 'text-gray-600'
                              }`}>
                                {item.duration}min
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Contenu détaillé */}
              {currentItem.content && currentItem.id !== "timeline" && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Contenu détaillé</h4>
                  <div className="text-sm whitespace-pre-wrap">{currentItem.content}</div>
                </div>
              )}

              {/* Zone de notes - masquée pour la timeline */}
              {currentItem.id !== "timeline" && (
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
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 30% */}
        <div className="w-80 border-l bg-white p-3 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Ordre du jour</h3>
            <div className="flex gap-1">
              {/* Bouton Mode Édition */}
              <Button 
                variant={isEditMode ? "default" : "outline"}
                size="sm" 
                onClick={() => setIsEditMode(!isEditMode)}
                className={isEditMode ? "bg-orange-600 hover:bg-orange-700" : ""}
                title={isEditMode ? "Sauvegarder les modifications" : "Modifier l'ordre du jour"}
              >
                {isEditMode ? <Save className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
              </Button>
              
              {/* Boutons d'ajout - visibles seulement en mode édition */}
              {isEditMode && (
                <>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => addNewItem(currentItemIndex)}
                    title="Ajouter un point principal"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => addBreak(currentItemIndex)}
                    title="Ajouter une pause"
                  >
                    <Coffee className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {isEditMode && (
            <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-800">
              <div className="flex items-center gap-1">
                <Move className="w-3 h-3" />
                Mode édition activé - Glissez les éléments pour les réorganiser
              </div>
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto space-y-1">
            {scheduledAgenda.map((item, index) => (
              <div
                key={item.id}
                className={`p-2 rounded border transition-colors text-xs ${
                  index === currentItemIndex
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                } ${isEditMode ? 'cursor-move' : 'cursor-pointer'} ${draggedItem === item.id ? 'opacity-50' : ''}`}
                onClick={() => !isEditMode && goToItem(index)}
                style={{ marginLeft: `${item.level * 12}px` }}
                draggable={isEditMode}
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
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
                        {item.startTime} ({item.level === 0 && item.subItems?.length > 0 ? item.effectiveDuration : item.duration}min)
                      </div>
                    </div>
                    {isEditMode && (
                      <div className="flex justify-between items-center mt-1">
                        <div className="flex gap-1">
                          {item.level === 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-4 w-4 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                addSubItem(index);
                              }}
                              title="Ajouter un sous-point"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-4 w-4 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingItem(item);
                              setShowEditModal(true);
                            }}
                            title="Modifier"
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-4 w-4 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteItem(item.id);
                          }}
                          title="Supprimer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal d'édition simple */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Modifier le point</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({...editingItem, title: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
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
                  <Label htmlFor="type">Type de point</Label>
                  <Select
                    value={editingItem.type}
                    onValueChange={(value) => setEditingItem({...editingItem, type: value as AgendaItem['type']})}
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

                {/* Section parente pour les sous-sections */}
                {editingItem && editingItem.level === 1 && (
                  <div>
                    <Label htmlFor="parentSection">Section parente</Label>
                    <Select
                      value={getParentSectionId(editingItem.id)}
                      onValueChange={(value) => moveSubsectionToSection(editingItem.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir une section..." />
                      </SelectTrigger>
                      <SelectContent>
                        {agenda
                          .filter(item => item.level === 0 && item.type !== 'break')
                          .map(section => (
                            <SelectItem key={section.id} value={section.id}>
                              {section.title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="presenter">Présentateur</Label>
                  <Input
                    id="presenter"
                    value={editingItem.presenter || ''}
                    onChange={(e) => setEditingItem({...editingItem, presenter: e.target.value})}
                  />
                </div>
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
                <Label htmlFor="content">Contenu détaillé</Label>
                <Textarea
                  id="content"
                  value={editingItem.content || ''}
                  onChange={(e) => setEditingItem({...editingItem, content: e.target.value})}
                  className="min-h-32"
                  placeholder="Contenu détaillé du point..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditModal(false)}>
                  Annuler
                </Button>
                <Button onClick={() => updateItem(editingItem)}>
                  Sauvegarder
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal participants */}
      {showParticipantsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Configuration de la réunion</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="meetingDate">Date de la réunion</Label>
                  <Input
                    id="meetingDate"
                    type="date"
                    value={meetingInfo.date}
                    onChange={(e) => setMeetingInfo({...meetingInfo, date: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="meetingTime">Heure de début</Label>
                  <Input
                    id="meetingTime"
                    type="time"
                    value={meetingInfo.time}
                    onChange={(e) => setMeetingInfo({...meetingInfo, time: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="meetingTitle">Titre de la réunion</Label>
                <Input
                  id="meetingTitle"
                  value={meetingInfo.title}
                  onChange={(e) => setMeetingInfo({...meetingInfo, title: e.target.value})}
                />
              </div>
              
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
              
              <Button onClick={() => setShowParticipantsModal(false)} className="w-full">
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}