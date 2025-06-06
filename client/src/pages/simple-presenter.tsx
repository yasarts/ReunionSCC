import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Clock, Users, CheckCircle, Circle, Play, Pause, SkipForward, Plus, Edit3, Trash2, Coffee, Settings, Link2, ChevronDown, ChevronUp, Home, FileDown, Move, Save, X, FileText, GripVertical, Edit, RotateCcw, Vote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getMeetingData, type AgendaItem } from '@/data/agenda';
import { IntegratedParticipantsManagement } from '@/components/IntegratedParticipantsManagement';
import { VoteCard } from '@/components/VoteCard';
import { CreateVoteModal } from '@/components/CreateVoteModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type MeetingType } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface MeetingInfo {
  title: string;
  date: string;
  time: string;
  participants: string[];
  pouvoir: string;
  meetingTypeId?: number;
}

export default function SimpleMeetingPresenter() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const meetingId = params.meetingId;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Récupérer les types de réunions disponibles
  const { data: meetingTypes } = useQuery({
    queryKey: ['/api/meeting-types'],
  });

  // Mutation pour supprimer un élément d'agenda
  const deleteAgendaItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("DELETE", `/api/agenda/${itemId}`);
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Élément d'agenda supprimé avec succès.",
      });
    },
    onError: (error) => {
      console.error('Error deleting agenda item:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'élément d'agenda.",
        variant: "destructive",
      });
    },
  });

  // Mutation pour mettre à jour un élément d'agenda
  const updateAgendaItemMutation = useMutation({
    mutationFn: async ({ itemId, updates }: { itemId: string; updates: any }) => {
      await apiRequest("PUT", `/api/agenda/${itemId}`, updates);
    },
    onSuccess: () => {
      // Pas de toast pour les mises à jour automatiques
    },
    onError: (error) => {
      console.error('Error updating agenda item:', error);
    },
  });
  
  const [currentItemIndex, setCurrentItemIndex] = useState(-1);
  // Chargement des données spécifiques à la réunion
  const meetingData = getMeetingData(meetingId || 'conseil-national-2025');
  
  const [agenda, setAgenda] = useState<AgendaItem[]>(() => {
    const storageKey = `meeting-agenda-${meetingId || 'default'}`;
    const deletedItemsKey = `deleted-agenda-items-${meetingId || 'default'}`;
    
    // Nettoyer les doublons dans les éléments supprimés
    const deletedItems = JSON.parse(localStorage.getItem(deletedItemsKey) || '[]');
    const uniqueDeletedItems = [...new Set(deletedItems)];
    if (deletedItems.length !== uniqueDeletedItems.length) {
      localStorage.setItem(deletedItemsKey, JSON.stringify(uniqueDeletedItems));
      console.log('Cleaned up duplicates in deleted items:', deletedItems.length, '->', uniqueDeletedItems.length);
    }
    
    console.log('Deleted items loaded:', uniqueDeletedItems);
    
    // Commencer avec l'agenda original
    let currentAgenda = [...meetingData.agendaItems];
    console.log('Original agenda length:', currentAgenda.length);
    
    // Appliquer les suppressions persistées
    if (uniqueDeletedItems.length > 0) {
      const originalLength = currentAgenda.length;
      currentAgenda = currentAgenda.filter(item => {
        const shouldKeep = !uniqueDeletedItems.includes(item.id);
        if (!shouldKeep) {
          console.log('Filtering out item:', item.id, item.title);
        }
        return shouldKeep;
      });
      console.log(`Filtered agenda: ${originalLength} -> ${currentAgenda.length} items`);
    }
    
    return currentAgenda;
  });
  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo>(() => {
    const storageKey = `meeting-info-${meetingId || 'default'}`;
    const savedMeetingInfo = localStorage.getItem(storageKey);
    if (savedMeetingInfo) {
      return JSON.parse(savedMeetingInfo);
    }
    
    // Données spécifiques selon l'ID de la réunion
    if (meetingId === 'reunion-budget-2025') {
      return {
        title: "Réunion Budget 2025",
        date: "15 janvier 2025",
        time: "14h00",
        participants: ["Marie Dubois", "Jean Martin", "Sophie Leroy", "Pierre Durand"],
        pouvoir: "Marie Dubois donne pouvoir à Jean Martin"
      };
    } else if (meetingId === 'conseil-national-2025') {
      return {
        title: "Conseil National 2025",
        date: "28 février 2025", 
        time: "10h00",
        participants: ["Christine Nissim", "Marc Laurent", "Annie Bertrand", "Claire Moreau"],
        pouvoir: "Christine Nissim donne pouvoir à Marc Laurent"
      };
    } else if (meetingId === 'assemblee-generale-ordinaire') {
      return {
        title: "Assemblée Générale Ordinaire",
        date: "20 mars 2025",
        time: "09h30",
        participants: ["Directeur Général", "Présidente", "Secrétaire Général", "Trésorier"],
        pouvoir: "Directeur Général donne pouvoir à la Présidente"
      };
    }
    
    return meetingData.meetingInfo;
  });
  const [itemStates, setItemStates] = useState<Record<string, { completed: boolean; notes: string; startTime?: Date; }>>({});
  const [meetingStartTime] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [itemStartTime, setItemStartTime] = useState<Date | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

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
  const [showParticipantsView, setShowParticipantsView] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  
  // États pour l'édition avancée
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editingTags, setEditingTags] = useState<string | null>(null);
  const [editedTags, setEditedTags] = useState('');
  const [editingPresentation, setEditingPresentation] = useState<string | null>(null);
  const [editedPresentationLink, setEditedPresentationLink] = useState('');
  const [editedPresentationTitle, setEditedPresentationTitle] = useState('');
  const [editingPresenter, setEditingPresenter] = useState<string | null>(null);
  const [editedPresenter, setEditedPresenter] = useState('');
  const [showAdvancedMode, setShowAdvancedMode] = useState<boolean>(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState<boolean>(false);
  const [showCreateVoteModal, setShowCreateVoteModal] = useState<boolean>(false);
  const [selectedAgendaItemForVote, setSelectedAgendaItemForVote] = useState<number | null>(null);
  const [isEditingVotes, setIsEditingVotes] = useState<boolean>(false);
  
  // État pour la configuration de la réunion
  const [editedMeetingInfo, setEditedMeetingInfo] = useState({
    title: '',
    date: '',
    time: '',
    description: '',
    meetingTypeId: undefined as number | undefined
  });


  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sauvegarde automatique des données dans localStorage
  useEffect(() => {
    const storageKey = `meeting-agenda-${meetingId || 'default'}`;
    localStorage.setItem(storageKey, JSON.stringify(agenda));
  }, [agenda, meetingId]);

  useEffect(() => {
    const storageKey = `meeting-info-${meetingId || 'default'}`;
    localStorage.setItem(storageKey, JSON.stringify(meetingInfo));
  }, [meetingInfo, meetingId]);

  const currentItem = agenda[currentItemIndex];
  const totalItems = agenda.length;
  const completedItems = Object.values(itemStates).filter(state => state.completed).length;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Fonction de débogage pour réinitialiser les données
  const resetMeetingData = () => {
    const agendaKey = `meeting-agenda-${meetingId || 'default'}`;
    const deletedItemsKey = `deleted-agenda-items-${meetingId || 'default'}`;
    
    // Supprimer uniquement les données d'agenda, préserver les infos de configuration
    localStorage.removeItem(agendaKey);
    localStorage.removeItem(`itemStates_${meetingId}`);
    
    // Recharger les données d'agenda en appliquant les suppressions persistées
    const freshData = getMeetingData(meetingId || 'conseil-national-2025');
    const deletedItems = JSON.parse(localStorage.getItem(deletedItemsKey) || '[]');
    
    let filteredAgenda = [...freshData.agendaItems];
    if (deletedItems.length > 0) {
      filteredAgenda = filteredAgenda.filter(item => !deletedItems.includes(item.id));
    }
    
    setAgenda(filteredAgenda);
    setCurrentItemIndex(-1);
  };

  // Fonction pour ouvrir la modale de configuration
  const openConfigModal = () => {
    // Récupérer les données sauvegardées pour pré-remplir le formulaire
    const savedInfo = localStorage.getItem(`meetingInfo_${meetingId}`);
    const savedData = savedInfo ? JSON.parse(savedInfo) : {};
    
    setEditedMeetingInfo({
      title: savedData.title || meetingInfo.title,
      date: savedData.date || meetingInfo.date,
      time: savedData.time || meetingInfo.time,
      description: savedData.description || '',
      meetingTypeId: savedData.meetingTypeId || meetingInfo.meetingTypeId
    });
    setShowConfigModal(true);
  };

  // Fonction pour sauvegarder les modifications
  const saveMeetingInfo = () => {
    const updatedInfo = {
      ...meetingInfo,
      title: editedMeetingInfo.title,
      date: editedMeetingInfo.date,
      time: editedMeetingInfo.time,
      meetingTypeId: editedMeetingInfo.meetingTypeId
    };
    
    // Sauvegarder dans localStorage pour la synchronisation
    localStorage.setItem(`meetingInfo_${meetingId}`, JSON.stringify({
      title: editedMeetingInfo.title,
      date: editedMeetingInfo.date,
      time: editedMeetingInfo.time,
      description: editedMeetingInfo.description,
      meetingTypeId: editedMeetingInfo.meetingTypeId
    }));
    
    // Déclencher un événement personnalisé pour notifier les autres composants
    window.dispatchEvent(new CustomEvent('meetingInfoUpdated', { 
      detail: { meetingId, updatedInfo } 
    }));
    
    setMeetingInfo(updatedInfo);
    setShowConfigModal(false);
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

  const exportToPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Configuration de l'encoding pour supporter les caractères français
      doc.setFont("helvetica");
      
      let yPosition = 20;
      const pageHeight = 297;
      const margin = 20;
      const lineHeight = 6;
      
      const addPageIfNeeded = (requiredSpace = 20) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
      };
      
      const addText = (text: string, fontSize = 10, isBold = false) => {
        doc.setFontSize(fontSize);
        if (isBold) doc.setFont("helvetica", "bold");
        else doc.setFont("helvetica", "normal");
        
        // Gérer les textes longs avec retour à la ligne
        const maxWidth = 170;
        const lines = doc.splitTextToSize(text, maxWidth);
        
        addPageIfNeeded(lines.length * lineHeight + 5);
        
        lines.forEach((line: string) => {
          doc.text(line, margin, yPosition);
          yPosition += lineHeight;
        });
        yPosition += 3; // Espacement supplémentaire
      };
      
      // En-tête du document
      addText(meetingInfo.title, 18, true);
      addText(`Date: ${formatDisplayDate(meetingInfo.date)}`, 12);
      addText(`Heure: ${meetingInfo.time}`, 12);
      addText(`Participants: ${meetingInfo.participants.join(', ')}`, 12);
      addText(`Pouvoir: ${meetingInfo.pouvoir}`, 12);
      
      yPosition += 10;
      addText('ORDRE DU JOUR', 16, true);
      yPosition += 5;
      
      // Parcourir tous les éléments de l'agenda
      const sections = agenda.filter(item => item.level === 0);
      
      sections.forEach((section, sectionIndex) => {
        const sectionNumber = sectionIndex + 1;
        
        // Section principale
        addText(`${sectionNumber}. ${section.title}`, 14, true);
        
        if (section.presenter) {
          addText(`Présenté par: ${section.presenter}`, 10);
        }
        
        addText(`Durée: ${section.duration} minutes`, 10);
        addText(`Type: ${getTypeLabel(section.type)}`, 10);
        
        if (section.content && section.content.trim()) {
          addText('Contenu:', 10, true);
          addText(section.content, 10);
        }
        
        if (section.visualLink && section.visualLink.trim()) {
          addText(`Lien de présentation: ${section.visualLink}`, 10);
        }
        
        // Sous-sections
        const subsections = getSubsections(section.id);
        subsections.forEach((subsection, subIndex) => {
          yPosition += 5;
          addText(`${sectionNumber}.${subIndex + 1} ${subsection.title}`, 12, true);
          
          if (subsection.presenter) {
            addText(`Présenté par: ${subsection.presenter}`, 10);
          }
          
          addText(`Durée: ${subsection.duration} minutes`, 10);
          addText(`Type: ${getTypeLabel(subsection.type)}`, 10);
          
          if (subsection.content && subsection.content.trim()) {
            addText('Contenu:', 10, true);
            addText(subsection.content, 10);
          }
          
          if (subsection.visualLink && subsection.visualLink.trim()) {
            addText(`Lien de présentation: ${subsection.visualLink}`, 10);
          }
        });
        
        yPosition += 8; // Espacement entre les sections
      });
      
      // Ajouter les informations de timing
      addPageIfNeeded(50);
      yPosition += 10;
      addText('PLANNING TEMPOREL', 14, true);
      
      const totalDuration = agenda.reduce((sum, item) => sum + item.duration, 0);
      addText(`Durée totale estimée: ${Math.floor(totalDuration / 60)}h ${totalDuration % 60}min`, 12);
      
      const startTime = new Date(`2024-01-01 ${meetingInfo.time}`);
      addText(`Heure de début: ${formatTime(startTime)}`, 10);
      
      const endTime = new Date(startTime.getTime() + totalDuration * 60000);
      addText(`Heure de fin estimée: ${formatTime(endTime)}`, 10);
      
      doc.save(`${meetingInfo.title.replace(/\s+/g, '_')}_ordre_du_jour_complet.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Erreur lors de l\'export PDF. Veuillez réessayer.');
    }
  };

  const exportToMarkdown = () => {
    try {
      let markdown = `# ${meetingInfo.title}\n\n`;
      markdown += `**Date:** ${formatDisplayDate(meetingInfo.date)}\n`;
      markdown += `**Heure:** ${meetingInfo.time}\n`;
      markdown += `**Participants:** ${meetingInfo.participants.join(', ')}\n`;
      markdown += `**Pouvoir:** ${meetingInfo.pouvoir}\n\n`;
      
      markdown += `## Ordre du jour\n\n`;
      
      const sections = agenda.filter(item => item.level === 0);
      
      sections.forEach((section, sectionIndex) => {
        const sectionNumber = sectionIndex + 1;
        
        // Section principale
        markdown += `### ${sectionNumber}. ${section.title}\n\n`;
        
        if (section.presenter) {
          markdown += `**Présenté par:** ${section.presenter}\n`;
        }
        
        markdown += `**Durée:** ${section.duration} minutes\n`;
        markdown += `**Type:** ${getTypeLabel(section.type)}\n\n`;
        
        if (section.content && section.content.trim()) {
          markdown += `**Contenu:**\n${section.content}\n\n`;
        }
        
        if (section.visualLink && section.visualLink.trim()) {
          markdown += `**Lien de présentation:** ${section.visualLink}\n\n`;
        }
        
        // Sous-sections
        const subsections = getSubsections(section.id);
        if (subsections.length > 0) {
          subsections.forEach((subsection, subIndex) => {
            markdown += `#### ${sectionNumber}.${subIndex + 1} ${subsection.title}\n\n`;
            
            if (subsection.presenter) {
              markdown += `**Présenté par:** ${subsection.presenter}\n`;
            }
            
            markdown += `**Durée:** ${subsection.duration} minutes\n`;
            markdown += `**Type:** ${getTypeLabel(subsection.type)}\n\n`;
            
            if (subsection.content && subsection.content.trim()) {
              markdown += `**Contenu:**\n${subsection.content}\n\n`;
            }
            
            if (subsection.visualLink && subsection.visualLink.trim()) {
              markdown += `**Lien de présentation:** ${subsection.visualLink}\n\n`;
            }
          });
        }
        
        markdown += `---\n\n`;
      });
      
      // Informations de timing
      const totalDuration = agenda.reduce((sum, item) => sum + item.duration, 0);
      markdown += `## Planning temporel\n\n`;
      markdown += `**Durée totale estimée:** ${Math.floor(totalDuration / 60)}h ${totalDuration % 60}min\n`;
      
      const startTime = new Date(`2024-01-01 ${meetingInfo.time}`);
      markdown += `**Heure de début:** ${formatTime(startTime)}\n`;
      
      const endTime = new Date(startTime.getTime() + totalDuration * 60000);
      markdown += `**Heure de fin estimée:** ${formatTime(endTime)}\n`;
      
      // Créer et télécharger le fichier
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${meetingInfo.title.replace(/\s+/g, '_')}_ordre_du_jour.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting Markdown:', error);
      alert('Erreur lors de l\'export Markdown. Veuillez réessayer.');
    }
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
      parentSectionId: parentId,
      tags: [],
      presentationLink: "",
      presentationTitle: ""
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
  };

  // Calculer la durée totale d'une section (incluant ses sous-sections)
  const getSectionTotalDuration = (sectionId: string): number => {
    const section = agenda.find(item => item.id === sectionId);
    if (!section || section.level !== 0) return 0;
    
    const subsections = getSubsections(sectionId);
    
    // Si la section a des sous-sections, utiliser la somme des sous-sections uniquement
    if (subsections.length > 0) {
      return subsections.reduce((total, sub) => total + sub.duration, 0);
    }
    
    // Sinon, utiliser la durée propre de la section
    return section.duration;
  };

  // Calculer l'heure de début d'un élément
  const getStartTime = (itemId: string) => {
    const itemIndex = agenda.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return new Date(`${meetingInfo.date} ${meetingInfo.time}`);
    
    let totalMinutes = 0;
    const startTime = new Date(`${meetingInfo.date} ${meetingInfo.time}`);
    
    // Calculer le temps accumulé jusqu'à cet élément
    for (let i = 0; i < itemIndex; i++) {
      const item = agenda[i];
      if (item.level === 0) { // Section principale
        totalMinutes += getSectionTotalDuration(item.id);
      }
    }
    
    const result = new Date(startTime);
    result.setMinutes(result.getMinutes() + totalMinutes);
    return result;
  };

  // Calculer l'heure de début d'une sous-section
  const getSubsectionStartTime = (subsectionId: string) => {
    const subsection = agenda.find(item => item.id === subsectionId);
    if (!subsection) return new Date();
    
    // Trouver la section parent
    const parentSectionIndex = agenda.findIndex(item => 
      item.level === 0 && agenda.findIndex(sub => sub.id === subsectionId) > agenda.findIndex(sec => sec.id === item.id)
    );
    
    if (parentSectionIndex === -1) return new Date();
    
    const parentSection = agenda[parentSectionIndex];
    const parentStartTime = getStartTime(parentSection.id);
    
    // Calculer les minutes accumulées des sous-sections précédentes
    let accumulatedMinutes = 0;
    const subsectionIndex = agenda.findIndex(item => item.id === subsectionId);
    
    for (let i = parentSectionIndex + 1; i < subsectionIndex; i++) {
      const item = agenda[i];
      if (item.level === 0) break; // Nouvelle section
      if (item.level === 1) {
        accumulatedMinutes += item.duration;
      }
    }
    
    const result = new Date(parentStartTime);
    result.setMinutes(result.getMinutes() + accumulatedMinutes);
    return result;
  };



  // Obtenir les sous-sections d'une section
  const getSubsections = (sectionId: string): AgendaItem[] => {
    const sectionIndex = agenda.findIndex(item => item.id === sectionId);
    if (sectionIndex === -1) return [];
    
    const subsections: AgendaItem[] = [];
    for (let i = sectionIndex + 1; i < agenda.length; i++) {
      const item = agenda[i];
      if (item.level === 0) break; // Nouvelle section, arrêter
      if (item.level === 1) {
        subsections.push(item);
      }
    }
    
    return subsections;
  };



  // Navigation vers un élément spécifique
  const navigateToItem = (itemId: string) => {
    const index = agenda.findIndex(item => item.id === itemId);
    if (index !== -1) {
      setCurrentItemIndex(index);
    }
  };

  // Fonctions pour sauvegarder les modifications
  const saveTitle = (itemId: string) => {
    const updatedAgenda = agenda.map(item => 
      item.id === itemId 
        ? { ...item, title: editedTitle }
        : item
    );
    setAgenda(updatedAgenda);
    setEditingTitle(null);
  };

  const saveTags = (itemId: string) => {
    const tagsArray = editedTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    const updatedAgenda = agenda.map(item => 
      item.id === itemId 
        ? { ...item, tags: tagsArray }
        : item
    );
    setAgenda(updatedAgenda);
    setEditingTags(null);
  };

  const savePresentation = (itemId: string) => {
    const updatedAgenda = agenda.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            presentationLink: editedPresentationLink,
            presentationTitle: editedPresentationTitle
          }
        : item
    );
    setAgenda(updatedAgenda);
    setEditingPresentation(null);
  };

  const savePresenter = (itemId: string) => {
    const updatedAgenda = agenda.map(item => 
      item.id === itemId 
        ? { ...item, presenter: editedPresenter }
        : item
    );
    setAgenda(updatedAgenda);
    setEditingPresenter(null);
  };

  const convertToSection = (itemId: string) => {
    const updatedAgenda = agenda.map(item => 
      item.id === itemId 
        ? { ...item, level: 0, parentSectionId: undefined, isSubsection: false }
        : item
    );
    setAgenda(updatedAgenda);
  };

  const convertToSubsection = (itemId: string, parentId: string) => {
    const updatedAgenda = agenda.map(item => 
      item.id === itemId 
        ? { ...item, level: 1, parentSectionId: parentId, isSubsection: true }
        : item
    );
    setAgenda(updatedAgenda);
  };

  const getAvailableParentSections = () => {
    return agenda.filter(item => item.level === 0 && !item.isSubsection);
  };

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
              <h1 className="text-xl font-semibold text-gray-900">
                {meetingInfo.title} <span className="text-sm text-gray-600 font-normal">({formatDisplayDate(meetingInfo.date)})</span>
              </h1>
            </div>
            
            {/* Right side - Action buttons */}
            <div className="flex items-center space-x-3">
              {/* Ordre du jour Button */}
              <Button 
                variant={currentItemIndex === -1 ? "default" : "ghost"} 
                size="sm" 
                className="flex items-center gap-2" 
                onClick={() => setCurrentItemIndex(-1)}
              >
                <FileText className="h-4 w-4" />
                Ordre du jour
              </Button>

              {/* Export Buttons */}
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={exportToPDF}>
                  <FileText className="h-4 w-4" />
                  Export PDF
                </Button>
                <Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={exportToMarkdown}>
                  <FileText className="h-4 w-4" />
                  Export MD
                </Button>
              </div>

              {/* Configuration Button */}
              <Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={openConfigModal}>
                <Settings className="h-4 w-4" />
                Configuration
              </Button>

              {/* Reset button temporairement désactivé pour tester la persistance */}

              {/* Participants Button */}
              <Button 
                variant={showParticipantsView ? "default" : "ghost"}
                size="sm" 
                className={`flex items-center gap-2 ${showParticipantsView ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}`}
                onClick={() => {
                  console.log('Participants button clicked, current state:', showParticipantsView);
                  setShowParticipantsView(!showParticipantsView);
                }}
              >
                <Users className="h-4 w-4" />
                Participants
              </Button>

              {/* Tableau de bord Button - Far right */}
              <Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={() => setLocation('/')}>
                <Home className="h-4 w-4" />
                Tableau de bord
              </Button>
            </div>
          </div>
          
          {/* Progress Bar - Below title */}
          <div className="pb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">
                Progression de la réunion • Durée: {getMeetingDuration()}
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
      <div className="flex-1 overflow-y-auto">
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
                
                {/* Affichage de l'heure dans la navigation */}
                <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-md">
                  {formatTime(currentTime)}
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
            {showParticipantsView ? (
              <div className="p-8">
                <IntegratedParticipantsManagement meetingId={1} />
              </div>
            ) : currentItemIndex === -1 ? (
              // Aperçu général interactif avec navigation hiérarchique et gestion complète
              <div className="p-8">
                <div className="max-w-4xl mx-auto">
                  <div className="mb-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Aperçu général de l'ordre du jour</h1>
                        <p className="text-gray-600">{meetingInfo.title} - {formatDisplayDate(meetingInfo.date)}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {isEditMode ? 'Mode édition activé - Glissez les éléments pour réorganiser' : 'Cliquez sur une section pour y accéder directement'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setIsEditMode(!isEditMode)}
                          className="flex items-center gap-1"
                        >
                          <Edit3 className="h-3 w-3" />
                          {isEditMode ? 'Terminer' : 'Modifier'}
                        </Button>
                        
                        {isEditMode && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowAddItemModal(true)}
                            className="flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            Ajouter
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {agenda.filter(item => item.level === 0).map((section, sectionIndex) => {
                      const subsections = getSubsections(section.id);
                      const totalDuration = getSectionTotalDuration(section.id);
                      const sectionNumber = sectionIndex + 1;
                      const isCompleted = itemStates[section.id]?.completed;

                      return (
                        <Card 
                          key={section.id} 
                          className={`group transition-all hover:shadow-md ${isEditMode ? 'cursor-default' : 'cursor-pointer'} ${isCompleted ? 'bg-green-50 border-green-200' : ''}`}
                        >
                          <CardHeader onClick={() => !isEditMode && navigateToItem(section.id)}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {isEditMode && (
                                  <div className="flex flex-col gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (sectionIndex > 0) {
                                          const sections = agenda.filter(item => item.level === 0);
                                          const currentSectionItem = sections[sectionIndex];
                                          const previousSectionItem = sections[sectionIndex - 1];
                                          
                                          const currentIndex = agenda.findIndex(a => a.id === currentSectionItem.id);
                                          const previousIndex = agenda.findIndex(a => a.id === previousSectionItem.id);
                                          
                                          // Obtenir toutes les sous-sections de chaque section
                                          const currentSubsections = getSubsections(currentSectionItem.id);
                                          const previousSubsections = getSubsections(previousSectionItem.id);
                                          
                                          const newAgenda = [...agenda];
                                          
                                          // Supprimer les sections et leurs sous-sections
                                          newAgenda.splice(currentIndex, 1 + currentSubsections.length);
                                          const adjustedPreviousIndex = previousIndex > currentIndex ? previousIndex - (1 + currentSubsections.length) : previousIndex;
                                          newAgenda.splice(adjustedPreviousIndex, 1 + previousSubsections.length);
                                          
                                          // Réinsérer dans l'ordre inverse
                                          const insertIndex = Math.min(previousIndex, currentIndex);
                                          newAgenda.splice(insertIndex, 0, currentSectionItem, ...currentSubsections);
                                          newAgenda.splice(insertIndex + 1 + currentSubsections.length, 0, previousSectionItem, ...previousSubsections);
                                          
                                          setAgenda(newAgenda);
                                        }
                                      }}
                                      disabled={sectionIndex === 0}
                                      className={`p-0.5 rounded ${sectionIndex === 0 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}
                                    >
                                      <ChevronUp className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const sections = agenda.filter(item => item.level === 0);
                                        if (sectionIndex < sections.length - 1) {
                                          const currentSectionItem = sections[sectionIndex];
                                          const nextSectionItem = sections[sectionIndex + 1];
                                          
                                          const currentIndex = agenda.findIndex(a => a.id === currentSectionItem.id);
                                          const nextIndex = agenda.findIndex(a => a.id === nextSectionItem.id);
                                          
                                          // Obtenir toutes les sous-sections de chaque section
                                          const currentSubsections = getSubsections(currentSectionItem.id);
                                          const nextSubsections = getSubsections(nextSectionItem.id);
                                          
                                          const newAgenda = [...agenda];
                                          
                                          // Supprimer les sections et leurs sous-sections
                                          newAgenda.splice(nextIndex, 1 + nextSubsections.length);
                                          newAgenda.splice(currentIndex, 1 + currentSubsections.length);
                                          
                                          // Réinsérer dans l'ordre inverse
                                          newAgenda.splice(currentIndex, 0, nextSectionItem, ...nextSubsections);
                                          newAgenda.splice(currentIndex + 1 + nextSubsections.length, 0, currentSectionItem, ...currentSubsections);
                                          
                                          setAgenda(newAgenda);
                                        }
                                      }}
                                      disabled={sectionIndex === agenda.filter(item => item.level === 0).length - 1}
                                      className={`p-0.5 rounded ${sectionIndex === agenda.filter(item => item.level === 0).length - 1 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}
                                    >
                                      <ChevronDown className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                                <span className="text-lg font-mono text-gray-500 min-w-[2rem]">{sectionNumber}.</span>
                                {isCompleted ? (
                                  <CheckCircle className="h-6 w-6 text-green-600" />
                                ) : (
                                  <Circle className="h-6 w-6 text-gray-400" />
                                )}
                                <div className="flex-1">
                                  <CardTitle className="text-xl hover:text-blue-600 transition-colors">{section.title}</CardTitle>
                                  {section.presenter && (
                                    <p className="text-sm text-gray-600 mt-1">Présenté par: {section.presenter}</p>
                                  )}
                                  <div className="flex items-center gap-2 mt-1">
                                    <Clock className="h-4 w-4 text-gray-500" />
                                    <span className="text-sm text-gray-600">
                                      Début: {formatTime(getStartTime(section.id))}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className={getTypeColor(section.type)}>
                                  {getTypeLabel(section.type)}
                                </Badge>
                                <Badge variant="outline">
                                  {totalDuration} min
                                </Badge>
                                {section.tags && section.tags.length > 0 && (
                                  <div className="flex gap-1">
                                    {section.tags.map(tag => (
                                      <Badge key={tag} variant="secondary" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                {isEditMode && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Supprimer localement d'abord pour une réaction immédiate
                                      const newAgenda = agenda.filter(a => a.id !== section.id);
                                      setAgenda(newAgenda);
                                      
                                      // Sauvegarder la suppression de façon persistante (éviter les doublons)
                                      const deletedItemsKey = `deleted-agenda-items-${meetingId || 'default'}`;
                                      const existingDeleted = JSON.parse(localStorage.getItem(deletedItemsKey) || '[]');
                                      if (!existingDeleted.includes(section.id)) {
                                        const updatedDeleted = [...existingDeleted, section.id];
                                        localStorage.setItem(deletedItemsKey, JSON.stringify(updatedDeleted));
                                      }
                                      
                                      // Sauvegarder l'agenda modifié
                                      const storageKey = `meeting-agenda-${meetingId || 'default'}`;
                                      localStorage.setItem(storageKey, JSON.stringify(newAgenda));
                                      
                                      // Synchroniser avec la base de données
                                      deleteAgendaItemMutation.mutate(section.id);
                                    }}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded ml-2"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            {section.presentationLink && (
                              <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                  <div className="flex items-center gap-2">
                                    <Link2 className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-800">
                                      {section.presentationTitle || 'Présentation visuelle'}
                                    </span>
                                  </div>
                                  <a 
                                    href={section.presentationLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline"
                                  >
                                    Ouvrir la présentation
                                  </a>
                                </div>
                              </div>
                            )}
                          </CardHeader>
                          
                          {subsections.length > 0 && (
                            <CardContent>
                              <div className="space-y-2">
                                <h4 className="font-semibold text-gray-700 mb-3">Sous-sections :</h4>
                                {subsections.map((subsection, subIndex) => {
                                  const isSubCompleted = itemStates[subsection.id]?.completed;
                                  return (
                                    <div 
                                      key={subsection.id} 
                                      onClick={() => !isEditMode && navigateToItem(subsection.id)}
                                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-gray-50 ${isEditMode ? 'cursor-default' : 'cursor-pointer'} ${isSubCompleted ? 'bg-green-50 border-green-200' : 'bg-white'}`}
                                    >
                                      <div className="flex items-center gap-3">
                                        {isEditMode && (
                                          <div className="flex flex-col gap-1">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (subIndex > 0) {
                                                  const currentIndex = agenda.findIndex(a => a.id === subsection.id);
                                                  const previousSubsection = subsections[subIndex - 1];
                                                  const previousIndex = agenda.findIndex(a => a.id === previousSubsection.id);
                                                  
                                                  const newAgenda = [...agenda];
                                                  [newAgenda[currentIndex], newAgenda[previousIndex]] = [newAgenda[previousIndex], newAgenda[currentIndex]];
                                                  setAgenda(newAgenda);
                                                }
                                              }}
                                              disabled={subIndex === 0}
                                              className={`p-0.5 rounded ${subIndex === 0 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}
                                            >
                                              <ChevronUp className="h-3 w-3" />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (subIndex < subsections.length - 1) {
                                                  const currentIndex = agenda.findIndex(a => a.id === subsection.id);
                                                  const nextSubsection = subsections[subIndex + 1];
                                                  const nextIndex = agenda.findIndex(a => a.id === nextSubsection.id);
                                                  
                                                  const newAgenda = [...agenda];
                                                  [newAgenda[currentIndex], newAgenda[nextIndex]] = [newAgenda[nextIndex], newAgenda[currentIndex]];
                                                  setAgenda(newAgenda);
                                                }
                                              }}
                                              disabled={subIndex === subsections.length - 1}
                                              className={`p-0.5 rounded ${subIndex === subsections.length - 1 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}
                                            >
                                              <ChevronDown className="h-3 w-3" />
                                            </button>
                                          </div>
                                        )}
                                        <span className="text-sm font-mono text-gray-500 min-w-[3rem]">{sectionNumber}.{subIndex + 1}</span>
                                        {isSubCompleted ? (
                                          <CheckCircle className="h-4 w-4 text-green-600" />
                                        ) : (
                                          <Circle className="h-4 w-4 text-gray-400" />
                                        )}
                                        <div>
                                          <span className="font-medium hover:text-blue-600 transition-colors">{subsection.title}</span>
                                          {subsection.presenter && (
                                            <p className="text-xs text-gray-500 mt-1">Présenté par: {subsection.presenter}</p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={getTypeColor(subsection.type)}>
                                          {getTypeLabel(subsection.type)}
                                        </Badge>
                                        <Badge variant="outline">
                                          {subsection.duration} min
                                        </Badge>
                                        {subsection.tags && subsection.tags.length > 0 && (
                                          <div className="flex gap-1">
                                            {subsection.tags.map(tag => (
                                              <Badge key={tag} variant="secondary" className="text-xs">
                                                {tag}
                                              </Badge>
                                            ))}
                                          </div>
                                        )}
                                        {isEditMode && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              // Supprimer localement d'abord pour une réaction immédiate
                                              const newAgenda = agenda.filter(a => a.id !== subsection.id);
                                              setAgenda(newAgenda);
                                              
                                              // Sauvegarder la suppression de façon persistante (éviter les doublons)
                                              const deletedItemsKey = `deleted-agenda-items-${meetingId || 'default'}`;
                                              const existingDeleted = JSON.parse(localStorage.getItem(deletedItemsKey) || '[]');
                                              if (!existingDeleted.includes(subsection.id)) {
                                                const updatedDeleted = [...existingDeleted, subsection.id];
                                                localStorage.setItem(deletedItemsKey, JSON.stringify(updatedDeleted));
                                              }
                                              
                                              // Sauvegarder l'agenda modifié
                                              const storageKey = `meeting-agenda-${meetingId || 'default'}`;
                                              localStorage.setItem(storageKey, JSON.stringify(newAgenda));
                                              
                                              // Synchroniser avec la base de données
                                              deleteAgendaItemMutation.mutate(subsection.id);
                                            }}
                                            className="p-1 text-red-500 hover:bg-red-50 rounded ml-2"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </div>

                  <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">Résumé de la réunion</h3>
                        <p className="text-sm text-gray-600">Durée totale estimée: {(() => {
                          const sections = agenda.filter(item => item.level === 0);
                          const totalMinutes = sections.reduce((acc, section) => acc + getSectionTotalDuration(section.id), 0);
                          const hours = Math.floor(totalMinutes / 60);
                          const minutes = totalMinutes % 60;
                          return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
                        })()}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Fin prévue: {(() => {
                            const sections = agenda.filter(item => item.level === 0);
                            const totalDuration = sections.reduce((acc, section) => acc + getSectionTotalDuration(section.id), 0);
                            const endTime = new Date(`${meetingInfo.date} ${meetingInfo.time}`);
                            endTime.setMinutes(endTime.getMinutes() + totalDuration);
                            return endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                          })()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Points traités</div>
                        <div className="text-2xl font-bold text-gray-900">{completedItems}/{totalItems}</div>
                        <Progress value={progress} className="w-32 h-2 mt-2" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : currentItem ? (
              <div className="p-8">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-gray-900">{currentItem.title}</h1>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAdvancedMode(!showAdvancedMode)}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                          title={showAdvancedMode ? "Mode simple" : "Mode édition"}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Badge className={getTypeColor(currentItem.type)}>
                        {getTypeLabel(currentItem.type)}
                      </Badge>
                    </div>

                    {/* Informations complémentaires sous l'en-tête */}
                    <div className="mb-6">
                      {currentItem.level === 0 && (
                        <div className="mb-3">
                          <p className="text-lg text-blue-600 font-medium">
                            Heure de début prévue : {(() => {
                              const sectionIndex = agenda.filter(item => item.level === 0).findIndex(section => section.id === currentItem.id);
                              if (sectionIndex === 0) {
                                return meetingInfo.time;
                              } else {
                                const startTime = new Date(`${meetingInfo.date} ${meetingInfo.time}`);
                                const previousSections = agenda.filter(item => item.level === 0).slice(0, sectionIndex);
                                const totalPreviousDuration = previousSections.reduce((acc, section) => 
                                  acc + getSectionTotalDuration(section.id), 0
                                );
                                startTime.setMinutes(startTime.getMinutes() + totalPreviousDuration);
                                return startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                              }
                            })()}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {currentItem.presenter && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>Présenté par: {currentItem.presenter}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>Durée: {currentItem.duration} min</span>
                        </div>
                      </div>
                    </div>

                    {/* Mode simple - Vue épurée */}
                    {!showAdvancedMode ? (
                      <div className="space-y-6">

                        {/* Tags visuels */}
                        {currentItem.tags && currentItem.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {currentItem.tags.map(tag => (
                              <Badge key={tag} variant="secondary" className="text-sm">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Présentation visuelle */}
                        {currentItem.presentationLink && (
                          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                                <Link2 className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-blue-900">
                                  {currentItem.presentationTitle || 'Présentation visuelle'}
                                </h3>
                                <p className="text-sm text-blue-700">Cliquez pour ouvrir dans un nouvel onglet</p>
                              </div>
                            </div>
                            <a 
                              href={currentItem.presentationLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                            >
                              <Link2 className="h-4 w-4" />
                              Ouvrir la présentation
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Mode édition avancée */
                      <div className="space-y-6">
                        {/* Édition du titre */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <h3 className="font-semibold text-gray-900">Titre et informations</h3>
                          </div>
                          
                          {editingTitle === currentItem.id ? (
                            <div className="space-y-2">
                              <Input
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                className="text-lg font-semibold"
                                placeholder="Titre de la section"
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => saveTitle(currentItem.id)}>
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingTitle(null)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <h2 className="text-xl font-semibold">{currentItem.title}</h2>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingTitle(currentItem.id);
                                  setEditedTitle(currentItem.title);
                                }}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}

                          {/* Édition du présentateur */}
                          <div className="mt-4">
                            {editingPresenter === currentItem.id ? (
                              <div className="space-y-2">
                                <Input
                                  value={editedPresenter}
                                  onChange={(e) => setEditedPresenter(e.target.value)}
                                  placeholder="Nom du présentateur"
                                />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => savePresenter(currentItem.id)}>
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingPresenter(null)}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-gray-500" />
                                  <span className="text-gray-700">
                                    {currentItem.presenter || "Aucun présentateur défini"}
                                  </span>
                                  <span className="text-gray-400">•</span>
                                  <Clock className="h-4 w-4 text-gray-500" />
                                  <span className="text-gray-700">{currentItem.duration} min</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingPresenter(currentItem.id);
                                    setEditedPresenter(currentItem.presenter || '');
                                  }}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Conversion section/sous-section */}
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Structure</h4>
                            <div className="flex items-center gap-2">
                              {currentItem.level === 0 ? (
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">Section principale</Badge>
                                  <Select
                                    onValueChange={(parentId) => convertToSubsection(currentItem.id, parentId)}
                                  >
                                    <SelectTrigger className="w-48">
                                      <SelectValue placeholder="Convertir en sous-section" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {getAvailableParentSections()
                                        .filter(section => section.id !== currentItem.id)
                                        .map(section => (
                                        <SelectItem key={section.id} value={section.id}>
                                          {section.title}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">Sous-section</Badge>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => convertToSection(currentItem.id)}
                                  >
                                    Convertir en section
                                  </Button>
                                  <Select
                                    value={currentItem.parentSectionId || ''}
                                    onValueChange={(parentId) => convertToSubsection(currentItem.id, parentId)}
                                  >
                                    <SelectTrigger className="w-48">
                                      <SelectValue placeholder="Changer de section parent" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {getAvailableParentSections().map(section => (
                                        <SelectItem key={section.id} value={section.id}>
                                          {section.title}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Édition des tags */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-900">Tags</h3>
                            {editingTags !== currentItem.id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingTags(currentItem.id);
                                  setEditedTags(currentItem.tags ? currentItem.tags.join(', ') : '');
                                }}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          
                          {editingTags === currentItem.id ? (
                            <div className="space-y-2">
                              <Input
                                value={editedTags}
                                onChange={(e) => setEditedTags(e.target.value)}
                                placeholder="Tags séparés par des virgules"
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => saveTags(currentItem.id)}>
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingTags(null)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {currentItem.tags && currentItem.tags.length > 0 ? (
                                currentItem.tags.map(tag => (
                                  <Badge key={tag} variant="secondary">
                                    {tag}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-gray-500">Aucun tag défini</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Édition de la présentation */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-900">Présentation visuelle</h3>
                            {editingPresentation !== currentItem.id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingPresentation(currentItem.id);
                                  setEditedPresentationLink(currentItem.presentationLink || '');
                                  setEditedPresentationTitle(currentItem.presentationTitle || '');
                                }}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          
                          {editingPresentation === currentItem.id ? (
                            <div className="space-y-3">
                              <Input
                                value={editedPresentationTitle}
                                onChange={(e) => setEditedPresentationTitle(e.target.value)}
                                placeholder="Titre de la présentation"
                              />
                              <Input
                                value={editedPresentationLink}
                                onChange={(e) => setEditedPresentationLink(e.target.value)}
                                placeholder="URL de la présentation"
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => savePresentation(currentItem.id)}>
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingPresentation(null)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              {currentItem.presentationLink ? (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Link2 className="h-4 w-4 text-blue-600" />
                                    <span className="font-medium text-blue-800">
                                      {currentItem.presentationTitle || 'Présentation visuelle'}
                                    </span>
                                  </div>
                                  <a 
                                    href={currentItem.presentationLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-sm"
                                  >
                                    Ouvrir la présentation
                                  </a>
                                </div>
                              ) : (
                                <span className="text-gray-500">Aucune présentation associée</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {!showAdvancedMode ? (
                      /* Mode simple - Contenu épuré */
                      <div className="space-y-6">
                        {/* Contenu principal */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                          {generateSectionMenu(currentItem)}
                          <div className="prose prose-gray max-w-none prose-lg">
                            <div 
                              className="whitespace-pre-wrap leading-relaxed text-gray-800"
                              dangerouslySetInnerHTML={{ 
                                __html: formatContentWithAnchors(currentItem.content || 'Aucun contenu défini pour cette section')
                              }}
                            />
                          </div>
                        </div>

                        {/* Section de vote */}
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
                              <Vote className="h-5 w-5" />
                              Votes et sondages
                            </h3>
                            <div className="flex items-center gap-2">
                              {!isEditingVotes && (
                                <Button
                                  onClick={() => setIsEditingVotes(true)}
                                  variant="outline"
                                  size="sm"
                                  className="text-purple-600 border-purple-300 hover:bg-purple-50"
                                >
                                  <Edit3 className="h-4 w-4 mr-2" />
                                  Gérer les votes
                                </Button>
                              )}
                              {isEditingVotes && (
                                <>
                                  <Button
                                    onClick={() => {
                                      setSelectedAgendaItemForVote(parseInt(currentItem.id));
                                      setShowCreateVoteModal(true);
                                    }}
                                    className="bg-purple-600 hover:bg-purple-700 text-white"
                                    size="sm"
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Créer un vote
                                  </Button>
                                  <Button
                                    onClick={() => setIsEditingVotes(false)}
                                    variant="outline"
                                    size="sm"
                                    className="text-gray-600 border-gray-300"
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Terminer
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Affichage des votes existants pour cette section */}
                          <VoteCard agendaItemId={parseInt(currentItem.id)} />
                        </div>

                        {/* Affichage des sous-sections si c'est une section principale */}
                        {currentItem.level === 0 && getSubsections(currentItem.id).length > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                              <FileText className="h-5 w-5" />
                              Sous-sections ({getSubsections(currentItem.id).length})
                            </h3>
                            <div className="space-y-3">
                              {getSubsections(currentItem.id).map((subsection, index) => (
                                <div 
                                  key={subsection.id}
                                  className="bg-white border border-blue-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                                  onClick={() => {
                                    const subsectionIndex = agenda.findIndex(item => item.id === subsection.id);
                                    if (subsectionIndex !== -1) {
                                      setCurrentItemIndex(subsectionIndex);
                                    }
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                                        {index + 1}
                                      </div>
                                      <div>
                                        <h4 className="font-medium text-gray-900">{subsection.title}</h4>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                          <Clock className="h-4 w-4" />
                                          <span>{subsection.duration} min</span>
                                          {subsection.presenter && (
                                            <>
                                              <span>•</span>
                                              <Users className="h-4 w-4" />
                                              <span>{subsection.presenter}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                      Sous-section
                                    </Badge>
                                  </div>
                                  {subsection.tags && subsection.tags.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {subsection.tags.map(tag => (
                                        <Badge key={tag} variant="outline" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Mode édition - Contenu détaillé */
                      <div className="space-y-6">
                        {/* Édition du contenu */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-900">Contenu</h3>
                            {!isEditingContent && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setIsEditingContent(true);
                                  setEditedContent(currentItem.content || '');
                                }}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          
                          {isEditingContent ? (
                            <div className="space-y-3">
                              <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded p-2">
                                Support Markdown: **gras**, *italique*, `code`, - listes, ## titres
                              </div>
                              <textarea
                                value={editedContent}
                                onChange={(e) => setEditedContent(e.target.value)}
                                className="w-full h-40 p-3 border rounded-lg resize-none font-mono text-sm"
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
                                  <Save className="h-4 w-4 mr-2" />
                                  Sauvegarder
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setIsEditingContent(false)}
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Annuler
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
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

                        {/* Édition de la durée */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-900">Durée prévue</h3>
                            {!isEditingDuration && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setIsEditingDuration(true);
                                  setEditedDuration(currentItem.duration);
                                }}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          
                          {isEditingDuration ? (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={editedDuration}
                                  onChange={(e) => setEditedDuration(parseInt(e.target.value) || 0)}
                                  className="w-20"
                                  min="1"
                                />
                                <span className="text-gray-600">minutes</span>
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
                                  <Save className="h-4 w-4 mr-2" />
                                  Sauvegarder
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setIsEditingDuration(false)}
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Annuler
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-lg">
                              <Clock className="h-5 w-5 text-blue-600" />
                              <span className="font-semibold text-gray-900">{currentItem.duration}</span>
                              <span className="text-gray-600">minutes</span>
                            </div>
                          )}
                        </div>

                        {/* Affichage des sous-sections en mode édition */}
                        {currentItem.level === 0 && getSubsections(currentItem.id).length > 0 && (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Sous-sections ({getSubsections(currentItem.id).length})
                            </h3>
                            <div className="space-y-2">
                              {getSubsections(currentItem.id).map((subsection, index) => (
                                <div 
                                  key={subsection.id}
                                  className="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                                  onClick={() => {
                                    const subsectionIndex = agenda.findIndex(item => item.id === subsection.id);
                                    if (subsectionIndex !== -1) {
                                      setCurrentItemIndex(subsectionIndex);
                                    }
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 bg-gray-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                                        {index + 1}
                                      </div>
                                      <div>
                                        <h4 className="font-medium text-gray-900 text-sm">{subsection.title}</h4>
                                        <div className="flex items-center gap-2 text-xs text-gray-600">
                                          <Clock className="h-3 w-3" />
                                          <span>{subsection.duration} min</span>
                                          {subsection.presenter && (
                                            <>
                                              <span>•</span>
                                              <Users className="h-3 w-3" />
                                              <span>{subsection.presenter}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      Modifier
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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



      {/* Modal d'ajout d'élément */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Ajouter un nouvel élément</h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const title = formData.get('title') as string;
              const duration = parseInt(formData.get('duration') as string);
              const parentId = newItemType === 'subsection' ? selectedParentId : undefined;
              
              if (title && duration) {
                addNewItem(title, duration, newItemType, parentId);
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Type d'élément</label>
                  <select 
                    value={newItemType} 
                    onChange={(e) => setNewItemType(e.target.value as 'section' | 'subsection' | 'break')}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="section">Section principale</option>
                    <option value="subsection">Sous-section</option>
                    <option value="break">Pause</option>
                  </select>
                </div>

                {newItemType === 'subsection' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Section parente</label>
                    <select 
                      value={selectedParentId} 
                      onChange={(e) => setSelectedParentId(e.target.value)}
                      className="w-full p-2 border rounded-md"
                      required
                    >
                      <option value="">Sélectionner une section</option>
                      {getParentSections().map(section => (
                        <option key={section.id} value={section.id}>
                          {section.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Titre</label>
                  <input
                    type="text"
                    name="title"
                    placeholder={newItemType === 'break' ? 'Pause' : 'Titre de l\'élément'}
                    defaultValue={newItemType === 'break' ? 'Pause' : ''}
                    className="w-full p-2 border rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Durée (minutes)</label>
                  <input
                    type="number"
                    name="duration"
                    placeholder="15"
                    defaultValue={newItemType === 'break' ? '15' : '10'}
                    min="1"
                    className="w-full p-2 border rounded-md"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddItemModal(false)}
                >
                  Annuler
                </Button>
                <Button type="submit">
                  Ajouter
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de configuration de la réunion */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Configuration de la réunion</h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              saveMeetingInfo();
            }} className="space-y-4">
              <div>
                <Label htmlFor="meeting-title">Titre de la réunion</Label>
                <Input
                  id="meeting-title"
                  value={editedMeetingInfo.title}
                  onChange={(e) => setEditedMeetingInfo({
                    ...editedMeetingInfo,
                    title: e.target.value
                  })}
                  placeholder="Titre de la réunion"
                  required
                />
              </div>

              <div>
                <Label htmlFor="meeting-date">Date</Label>
                <Input
                  id="meeting-date"
                  type="date"
                  value={editedMeetingInfo.date}
                  onChange={(e) => setEditedMeetingInfo({
                    ...editedMeetingInfo,
                    date: e.target.value
                  })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="meeting-time">Heure de début</Label>
                <Input
                  id="meeting-time"
                  type="time"
                  value={editedMeetingInfo.time}
                  onChange={(e) => setEditedMeetingInfo({
                    ...editedMeetingInfo,
                    time: e.target.value
                  })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="meeting-type">Type de réunion</Label>
                <Select
                  value={editedMeetingInfo.meetingTypeId?.toString() || ""}
                  onValueChange={(value) => setEditedMeetingInfo({
                    ...editedMeetingInfo,
                    meetingTypeId: value ? parseInt(value) : undefined
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type de réunion" />
                  </SelectTrigger>
                  <SelectContent>
                    {meetingTypes?.map((type: MeetingType) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: type.color }}
                          />
                          {type.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="meeting-description">Description courte</Label>
                <Textarea
                  id="meeting-description"
                  value={editedMeetingInfo.description}
                  onChange={(e) => setEditedMeetingInfo({
                    ...editedMeetingInfo,
                    description: e.target.value
                  })}
                  placeholder="Description courte de la réunion"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowConfigModal(false)}
                >
                  Annuler
                </Button>
                <Button type="submit">
                  Sauvegarder
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale de création de vote */}
      <CreateVoteModal
        isOpen={showCreateVoteModal}
        onClose={() => {
          setShowCreateVoteModal(false);
          setSelectedAgendaItemForVote(null);
        }}
        agendaItemId={selectedAgendaItemForVote}
      />

    </div>
  );
}