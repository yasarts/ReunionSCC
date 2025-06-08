import { useState } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Clock, Users, FileText, Plus, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function MeetingPage() {
  const { meetingId } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showStructuredView, setShowStructuredView] = useState(false);
  const [structuredAgenda, setStructuredAgenda] = useState(null);

  const { data: meeting, isLoading } = useQuery({
    queryKey: ['/api/meetings', meetingId],
    enabled: !!meetingId,
  });

  const { data: agenda, refetch: refetchAgenda } = useQuery({
    queryKey: ['/api/meetings', meetingId, 'agenda'],
    enabled: !!meetingId,
  });

  // Debug: Log agenda data
  console.log('Agenda data:', agenda, 'Type:', typeof agenda, 'Is Array:', Array.isArray(agenda));

  const { data: participants } = useQuery({
    queryKey: ['/api/meetings', meetingId, 'participants'],
    enabled: !!meetingId,
  });

  // Mutation pour créer des éléments d'agenda
  const createAgendaItemMutation = useMutation({
    mutationFn: async (agendaItem: any) => {
      return await apiRequest('POST', `/api/meetings/${meetingId}/agenda`, agendaItem);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetings', meetingId, 'agenda'] });
    },
    onError: (error: any) => {
      console.error('Erreur lors de la création de l\'élément d\'agenda:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer l'élément d'agenda",
        variant: "destructive",
      });
    },
  });

  // Fonction pour générer un ordre du jour structuré à partir des données existantes
  const generateStructuredAgenda = () => {
    if (!agenda || !Array.isArray(agenda) || agenda.length === 0) {
      toast({
        title: "Information",
        description: "Aucun élément d'agenda trouvé pour générer l'ordre du jour",
        variant: "default",
      });
      return;
    }

    // Créer un ordre du jour structuré basé sur les données existantes
    const structuredAgenda = [];
    
    // 1. Ouverture de séance (si existante)
    const openingItem = agenda.find((item: any) => item.type === 'procedural' || item.title?.toLowerCase().includes('ouverture'));
    if (openingItem) {
      structuredAgenda.push({
        section: "1. Ouverture de séance",
        items: [openingItem],
        duration: openingItem.duration || 5
      });
    }

    // 2. Grouper les éléments par sections principales
    const discussionItems = agenda.filter((item: any) => 
      item.type === 'discussion' && !item.title?.toLowerCase().includes('ouverture')
    );

    // Organiser par niveau hiérarchique basé sur order_index
    const sections = [];
    let currentSection = null;
    
    discussionItems.forEach((item: any) => {
      if (item.order_index < 200) { // Section 1
        if (!sections.find(s => s.title === "Points principaux")) {
          sections.push({
            title: "2. Points principaux",
            items: [],
            totalDuration: 0
          });
        }
        const section = sections.find(s => s.title === "Points principaux");
        section.items.push(item);
        section.totalDuration += item.duration || 10;
      } else if (item.order_index < 300) { // Section 2
        if (!sections.find(s => s.title === "Questions spécifiques")) {
          sections.push({
            title: "3. Questions spécifiques", 
            items: [],
            totalDuration: 0
          });
        }
        const section = sections.find(s => s.title === "Questions spécifiques");
        section.items.push(item);
        section.totalDuration += item.duration || 10;
      } else { // Section 3+
        if (!sections.find(s => s.title === "Points divers")) {
          sections.push({
            title: "4. Points divers",
            items: [],
            totalDuration: 0
          });
        }
        const section = sections.find(s => s.title === "Points divers");
        section.items.push(item);
        section.totalDuration += item.duration || 10;
      }
    });

    structuredAgenda.push(...sections);

    // 3. Clôture
    structuredAgenda.push({
      section: `${structuredAgenda.length + 1}. Clôture de séance`,
      items: [{
        title: "Prochaine réunion et clôture",
        description: "Définition de la date de la prochaine réunion",
        duration: 5
      }],
      duration: 5
    });

    return structuredAgenda;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Réunion non trouvée</h2>
          <p className="text-gray-600 mb-4">Cette réunion n'existe pas ou a été supprimée.</p>
          <Button asChild>
            <Link href="/">Retour au tableau de bord</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Link>
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">{meeting.title}</h1>
          </div>
          
          <div className="flex gap-2">
            <Button asChild>
              <Link href={`/presenter/${meetingId}`}>
                Lancer la présentation
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informations principales */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Détails de la réunion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(meeting.date).toLocaleDateString('fr-FR')} à {meeting.time}</span>
                </div>
                
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Durée estimée: {meeting.totalDuration || 0} minutes</span>
                </div>
                
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>{participants?.length || 0} participants</span>
                </div>
                
                <div className="flex items-center gap-2 text-gray-600">
                  <FileText className="w-4 h-4" />
                  <span>{agenda?.length || 0} points à l'ordre du jour</span>
                </div>

                {meeting.description && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-600">{meeting.description}</p>
                  </div>
                )}

                <div>
                  <Badge variant={
                    meeting.status === 'completed' ? "default" : 
                    meeting.status === 'scheduled' ? "secondary" : 
                    "outline"
                  }>
                    {meeting.status === 'completed' ? "Terminée" : 
                     meeting.status === 'scheduled' ? "Programmée" : 
                     "Brouillon"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Ordre du jour */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Ordre du jour</CardTitle>
                <div className="flex gap-2">
                  {agenda && Array.isArray(agenda) && agenda.length > 0 && (
                    <>
                      <Button 
                        onClick={() => {
                          const structured = generateStructuredAgenda();
                          if (structured) {
                            setStructuredAgenda(structured);
                            setShowStructuredView(true);
                            toast({
                              title: "Ordre du jour structuré",
                              description: `Agenda organisé en ${structured.length} sections principales`,
                            });
                          }
                        }}
                        variant="outline" 
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Générer ordre du jour structuré
                      </Button>
                      {showStructuredView && (
                        <Button 
                          onClick={() => setShowStructuredView(false)}
                          variant="outline" 
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <List className="w-4 h-4" />
                          Vue normale
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {agenda && Array.isArray(agenda) && agenda.length > 0 ? (
                  <div className="space-y-3">
                    {showStructuredView && structuredAgenda ? (
                      // Vue structurée
                      <div className="space-y-6">
                        {structuredAgenda.map((section: any, sectionIndex: number) => (
                          <div key={sectionIndex} className="border-l-4 border-blue-500 pl-4">
                            <h3 className="text-lg font-semibold mb-3 text-blue-700">
                              {section.section || section.title}
                            </h3>
                            <div className="space-y-2">
                              {section.items.map((item: any, itemIndex: number) => (
                                <div key={item.id || itemIndex} className="bg-gray-50 p-3 rounded-lg">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <h4 className="font-medium">{item.title}</h4>
                                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                      {item.content && (
                                        <div className="mt-2 p-2 bg-white rounded border">
                                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                            {item.content.substring(0, 200)}
                                            {item.content.length > 200 && "..."}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col items-end gap-2 ml-4">
                                      <Badge variant="secondary">{item.type}</Badge>
                                      <span className="text-sm text-gray-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {item.duration} min
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {section.totalDuration && (
                              <div className="mt-2 text-sm text-gray-600">
                                Durée totale de la section: {section.totalDuration} min
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Vue normale
                      <div className="space-y-3">
                        {agenda.map((item: any, index: number) => (
                          <div key={item.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white text-sm rounded-full flex items-center justify-center">
                              {index + 1}
                            </span>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{item.title}</h4>
                              {item.description && (
                                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                              )}
                              {item.content && (
                                <div className="mt-2 p-2 bg-white rounded border">
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                    {item.content.substring(0, 150)}
                                    {item.content.length > 150 && "..."}
                                  </p>
                                </div>
                              )}
                              {item.duration && (
                                <span className="text-xs text-gray-500">{item.duration} min</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">Aucun point à l'ordre du jour</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Participants */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Participants</CardTitle>
              </CardHeader>
              <CardContent>
                {participants && participants.length > 0 ? (
                  <div className="space-y-3">
                    {participants.map((participant: any) => (
                      <div key={participant.userId} className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {participant.user?.firstName?.charAt(0)}{participant.user?.lastName?.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {participant.user?.firstName} {participant.user?.lastName}
                          </p>
                          <p className="text-sm text-gray-600">{participant.user?.email}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {participant.status || 'Invité'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Aucun participant</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}