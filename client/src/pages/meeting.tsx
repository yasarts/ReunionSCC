import { useState } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Clock, Users, FileText, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function MeetingPage() {
  const { meetingId } = useParams();
  const { toast } = useToast();
  const [showStructuredView, setShowStructuredView] = useState(false);
  const [structuredAgenda, setStructuredAgenda] = useState<any[]>([]);

  // Requêtes pour récupérer les données de la base
  const { data: meeting, isLoading: meetingLoading } = useQuery({
    queryKey: ['/api/meetings', meetingId],
    enabled: !!meetingId,
  });

  const { data: agenda, isLoading: agendaLoading } = useQuery({
    queryKey: ['/api/meetings', meetingId, 'agenda'],
    enabled: !!meetingId,
  });

  // Debug pour voir les données d'agenda
  console.log('DEBUG - Agenda data:', agenda);
  console.log('DEBUG - Is array?', Array.isArray(agenda));
  console.log('DEBUG - Length:', (agenda as any)?.length);

  const { data: participants, isLoading: participantsLoading } = useQuery({
    queryKey: ['/api/meetings', meetingId, 'participants'],
    enabled: !!meetingId,
  });

  // Fonction pour générer un ordre du jour structuré basé sur les données réelles
  const generateStructuredAgenda = () => {
    if (!agenda || !Array.isArray(agenda) || agenda.length === 0) {
      toast({
        title: "Information",
        description: "Aucun élément d'agenda trouvé",
        variant: "default",
      });
      return null;
    }

    // Organiser par orderIndex
    const sortedAgenda = [...agenda].sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0));
    
    // Grouper par sections principales et sous-sections
    const sections = new Map();
    const subsections = new Map();
    
    // Premier passage : identifier les sections principales
    sortedAgenda.forEach((item: any) => {
      if (item.level === 1 || !item.parentId) {
        const sectionKey = `section-${item.id}`;
        sections.set(sectionKey, {
          id: item.id,
          title: item.title,
          description: item.description,
          items: [item],
          subsections: [],
          totalDuration: item.duration || 0,
          orderIndex: item.orderIndex
        });
      }
    });
    
    // Deuxième passage : organiser les sous-sections
    sortedAgenda.forEach((item: any) => {
      if (item.level === 2 && item.parentId) {
        // Trouver la section parent
        const parentSection = Array.from(sections.values()).find(s => s.id === item.parentId);
        if (parentSection) {
          parentSection.subsections.push(item);
          parentSection.totalDuration += item.duration || 0;
        } else {
          // Si pas de parent trouvé, créer une section "Sous-sections orphelines"
          const orphanKey = "orphan-subsections";
          if (!sections.has(orphanKey)) {
            sections.set(orphanKey, {
              id: 0,
              title: "Sous-sections",
              description: "Éléments sans section parent définie",
              items: [],
              subsections: [],
              totalDuration: 0,
              orderIndex: 9999
            });
          }
          sections.get(orphanKey).subsections.push(item);
          sections.get(orphanKey).totalDuration += item.duration || 0;
        }
      }
    });

    // Trier les sections par orderIndex et retourner
    return Array.from(sections.values()).sort((a, b) => a.orderIndex - b.orderIndex);
  };

  if (meetingLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de la réunion...</p>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Réunion non trouvée</h1>
          <Link href="/dashboard">
            <Button>Retour au tableau de bord</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* En-tête */}
        <div className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au tableau de bord
          </Link>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{(meeting as any)?.title || 'Réunion'}</h1>
                <p className="text-gray-600 mb-4">{(meeting as any)?.description || ''}</p>
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {(meeting as any)?.date ? new Date((meeting as any).date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 'Date non définie'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {(meeting as any)?.date ? new Date((meeting as any).date).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Heure non définie'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {(participants as any)?.length || 0} participant(s)
                  </div>
                </div>
              </div>
              <Badge variant="secondary">{(meeting as any)?.status || 'En cours'}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ordre du jour */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Ordre du jour</CardTitle>
                <div className="flex gap-2">
                  {agenda && Array.isArray(agenda) && (agenda as any[]).length > 0 && (
                    <>
                      <Button 
                        onClick={() => {
                          const structured = generateStructuredAgenda();
                          if (structured) {
                            setStructuredAgenda(structured);
                            setShowStructuredView(true);
                            toast({
                              title: "Vue structurée activée",
                              description: `Agenda organisé en ${structured.length} sections`,
                            });
                          }
                        }}
                        variant="outline" 
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Vue structurée
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
                {agendaLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-500">Chargement de l'agenda...</p>
                  </div>
                ) : agenda && Array.isArray(agenda) && agenda.length > 0 ? (
                  <div className="space-y-3">
                    {showStructuredView && structuredAgenda ? (
                      // Vue structurée avec hiérarchie
                      <div className="space-y-6">
                        {(structuredAgenda as any[]).map((section: any, sectionIndex: number) => (
                          <div key={sectionIndex} className="border-l-4 border-blue-500 pl-4">
                            <h3 className="text-lg font-semibold mb-3 text-blue-700">
                              {section.title}
                            </h3>
                            {section.description && (
                              <p className="text-sm text-gray-600 mb-3">{section.description}</p>
                            )}
                            
                            {/* Éléments principaux de la section */}
                            <div className="space-y-2 mb-4">
                              {section.items.map((item: any, itemIndex: number) => (
                                <div key={item.id} className="bg-gray-50 p-3 rounded-lg">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <h4 className="font-medium">{item.title}</h4>
                                      {item.description && (
                                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                      )}
                                      {item.content && (
                                        <div className="mt-2 p-2 bg-white rounded border">
                                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                            {item.content.length > 200 
                                              ? `${item.content.substring(0, 200)}...` 
                                              : item.content}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col items-end gap-2 ml-4">
                                      <Badge variant="secondary">{item.type}</Badge>
                                      {item.duration && (
                                        <span className="text-sm text-gray-500 flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {item.duration} min
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Sous-sections */}
                            {section.subsections && section.subsections.length > 0 && (
                              <div className="ml-4 border-l-2 border-gray-300 pl-4">
                                <h4 className="text-md font-medium mb-2 text-gray-700">Sous-sections :</h4>
                                <div className="space-y-2">
                                  {section.subsections.map((subsection: any, subIndex: number) => (
                                    <div key={subsection.id} className="bg-blue-50 p-3 rounded-lg">
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <h5 className="font-medium text-sm">{subsection.title}</h5>
                                          {subsection.description && (
                                            <p className="text-xs text-gray-600 mt-1">{subsection.description}</p>
                                          )}
                                          {subsection.content && (
                                            <div className="mt-2 p-2 bg-white rounded border">
                                              <p className="text-xs text-gray-700 whitespace-pre-wrap">
                                                {subsection.content.length > 150 
                                                  ? `${subsection.content.substring(0, 150)}...` 
                                                  : subsection.content}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex flex-col items-end gap-1 ml-4">
                                          <Badge variant="outline" className="text-xs">{subsection.type}</Badge>
                                          {subsection.duration && (
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                              <Clock className="w-3 h-3" />
                                              {subsection.duration} min
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {section.totalDuration > 0 && (
                              <div className="mt-3 text-sm text-gray-600 font-medium">
                                Durée totale: {section.totalDuration} min
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Vue normale
                      <div className="space-y-3">
                        {(agenda as any[]).map((item: any, index: number) => (
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
                                    {item.content.length > 150 
                                      ? `${item.content.substring(0, 150)}...` 
                                      : item.content}
                                  </p>
                                </div>
                              )}
                              {item.duration && (
                                <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                  <Clock className="w-3 h-3" />
                                  {item.duration} min
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Aucun élément à l'ordre du jour</p>
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
                {participantsLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">Chargement...</p>
                  </div>
                ) : participants && (participants as any[]).length > 0 ? (
                  <div className="space-y-3">
                    {(participants as any[]).map((participant: any) => (
                      <div key={participant.user.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {participant.user.firstName?.charAt(0) || participant.user.email?.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {participant.user.firstName} {participant.user.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{participant.user.email}</p>
                          {participant.proxyCompany && (
                            <p className="text-xs text-blue-600">
                              Représente: {participant.proxyCompany.name}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {participant.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 text-sm">Aucun participant</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}