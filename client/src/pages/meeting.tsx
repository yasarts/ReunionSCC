import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ParticipantsModal } from "@/components/ParticipantsModal";
import { apiRequest } from "@/lib/queryClient";
import type { Meeting, AgendaItem, Vote, VoteResponse } from "@/types";
import { 
  ArrowLeft, 
  Clock, 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Edit,
  Vote as VoteIcon,
  Users,
  CheckCircle,
  Circle,
  UserCheck
} from "lucide-react";

export default function MeetingView() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);

  const { data: meeting, isLoading, error } = useQuery<Meeting>({
    queryKey: [`/api/meetings/${id}`],
    enabled: !!id,
  });

  const { data: votes } = useQuery<Vote[]>({
    queryKey: [`/api/agenda/${meeting?.agendaItems?.[currentTopicIndex]?.id}/votes`],
    enabled: !!meeting?.agendaItems?.[currentTopicIndex]?.id,
  });

  const { data: participants } = useQuery({
    queryKey: [`/api/meetings/${id}/participants`],
    enabled: !!id,
  });

  // WebSocket connection
  useEffect(() => {
    if (!id) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected");
      ws.send(JSON.stringify({
        type: 'join_meeting',
        meetingId: parseInt(id)
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'vote_update') {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/agenda/${meeting?.agendaItems?.[currentTopicIndex]?.id}/votes`] 
        });
      }
    };

    setWebsocket(ws);

    return () => {
      ws.close();
    };
  }, [id, queryClient, meeting?.agendaItems, currentTopicIndex]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const castVoteMutation = useMutation({
    mutationFn: async ({ voteId, option }: { voteId: number; option: string }) => {
      await apiRequest("POST", `/api/votes/${voteId}/cast`, { option });
    },
    onSuccess: (_, { voteId }) => {
      if (websocket) {
        websocket.send(JSON.stringify({
          type: 'vote_cast',
          voteId,
          meetingId: parseInt(id!)
        }));
      }
      queryClient.invalidateQueries({ 
        queryKey: [`/api/agenda/${meeting?.agendaItems?.[currentTopicIndex]?.id}/votes`] 
      });
    },
  });

  const updateAgendaItemMutation = useMutation({
    mutationFn: async ({ itemId, updates }: { itemId: number; updates: Partial<AgendaItem> }) => {
      const response = await apiRequest("PUT", `/api/agenda/${itemId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/meetings/${id}`] });
    },
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'procedural': return '📋';
      case 'presentation': return '📊';
      case 'discussion': return '💬';
      default: return '📝';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'procedural': return 'bg-blue-100 text-blue-800';
      case 'presentation': return 'bg-green-100 text-green-800';
      case 'discussion': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderMarkdown = (text?: string) => {
    if (!text) return "Aucun contenu détaillé disponible.";
    
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^### (.*$)/gm, '<h4 class="text-md font-semibold text-gray-800 mt-3 mb-1">$1</h4>')
      .replace(/^## (.*$)/gm, '<h3 class="text-lg font-semibold text-gray-800 mt-4 mb-2">$1</h3>')
      .replace(/^# (.*$)/gm, '<h2 class="text-xl font-bold text-gray-800 mt-4 mb-2">$1</h2>')
      .replace(/^• (.*$)/gm, '<li class="ml-4">$1</li>')
      .replace(/(<li.*<\/li>)/gs, '<ul class="list-disc ml-4 my-2">$1</ul>')
      .replace(/\n\n/g, '</p><p class="mb-2">')
      .replace(/^(?!<[h2-4]|<ul|<li)(.+)$/gm, '<p class="mb-2">$1</p>')
      .replace(/(<p class="mb-2"><\/p>)/g, '');
  };

  const handleMarkComplete = async () => {
    const currentItem = meeting?.agendaItems?.[currentTopicIndex];
    if (!currentItem) return;

    await updateAgendaItemMutation.mutateAsync({
      itemId: currentItem.id,
      updates: { 
        status: 'completed',
        completedAt: new Date().toISOString()
      }
    });

    // Move to next topic if available
    if (currentTopicIndex < (meeting?.agendaItems?.length || 0) - 1) {
      setCurrentTopicIndex(prev => prev + 1);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
            <Skeleton className="h-8 w-64" />
          </div>
        </header>
        <div className="max-w-7xl mx-auto p-6">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertDescription>
            Erreur lors du chargement de la réunion. Veuillez réessayer.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentItem = meeting.agendaItems?.[currentTopicIndex];
  const completedCount = meeting.agendaItems?.filter(item => item.status === 'completed').length || 0;
  const totalCount = meeting.agendaItems?.length || 0;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{meeting.title}</h1>
                <p className="text-sm text-gray-500">
                  {participants?.length || 0} participants présents
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Participants Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowParticipantsModal(true)}
                className="flex items-center gap-2"
              >
                <UserCheck className="h-4 w-4" />
                Participants ({participants?.length || 0})
              </Button>

              {/* Timer */}
              <div className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2">
                <Clock className="h-4 w-4 text-gray-600" />
                <span className="font-mono text-lg font-semibold text-gray-900">
                  {formatTime(timer)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="text-green-600 hover:text-green-700"
                >
                  {isTimerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTimer(0)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto">
        <div className="flex">
          {/* Sidebar - Agenda */}
          <aside className="w-80 bg-white border-r border-gray-200 min-h-screen">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Ordre du jour</h2>
              
              <div className="space-y-2">
                {meeting.agendaItems?.map((item, index) => (
                  <div 
                    key={item.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      index === currentTopicIndex 
                        ? 'bg-indigo-50 border-l-4 border-indigo-500' 
                        : item.status === 'completed'
                          ? 'bg-green-50 border-l-4 border-green-500 opacity-75'
                          : 'border border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setCurrentTopicIndex(index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getTypeIcon(item.type)}</span>
                        <div>
                          <h3 className="font-medium text-gray-900">{item.title}</h3>
                          <p className="text-sm text-gray-600">{item.duration} min</p>
                        </div>
                      </div>
                      {item.status === 'completed' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : index === currentTopicIndex ? (
                        <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-300" />
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    )}
                    <Badge className={`mt-2 ${getTypeColor(item.type)}`} variant="secondary">
                      {item.type === 'procedural' && 'Procédural'}
                      {item.type === 'presentation' && 'Présentation'}
                      {item.type === 'discussion' && 'Discussion'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-6">
            <div className="space-y-6">
              {/* Current Topic */}
              {currentItem && (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getTypeIcon(currentItem.type)}</span>
                        <div>
                          <CardTitle className="text-2xl font-bold text-gray-900">
                            {currentItem.title}
                          </CardTitle>
                          {currentItem.description && (
                            <p className="text-gray-600 text-lg mt-1">
                              {currentItem.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge className={getTypeColor(currentItem.type)}>
                          {currentItem.type === 'procedural' && 'Procédural'}
                          {currentItem.type === 'presentation' && 'Présentation'}
                          {currentItem.type === 'discussion' && 'Discussion'}
                        </Badge>
                        {user?.permissions.canEdit && (
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    {/* Content */}
                    <div className="prose max-w-none mb-6">
                      <div 
                        className="bg-gray-50 rounded-lg p-4"
                        dangerouslySetInnerHTML={{ 
                          __html: renderMarkdown(currentItem.content) 
                        }}
                      />
                    </div>
                    
                    {/* Navigation Controls */}
                    <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                      <Button
                        variant="outline"
                        disabled={currentTopicIndex === 0}
                        onClick={() => setCurrentTopicIndex(prev => prev - 1)}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Précédent
                      </Button>
                      
                      <div className="flex items-center space-x-3">
                        {user?.permissions.canEdit && currentItem.status !== 'completed' && (
                          <Button 
                            onClick={handleMarkComplete}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Marquer comme traité
                          </Button>
                        )}
                        
                        <Button
                          disabled={currentTopicIndex === (meeting.agendaItems?.length || 0) - 1}
                          onClick={() => setCurrentTopicIndex(prev => prev + 1)}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          Sujet suivant
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Voting Section */}
              {votes && votes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <VoteIcon className="h-5 w-5 mr-2" />
                      Vote en cours
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {votes.map((vote) => (
                      <div key={vote.id} className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="font-medium text-blue-900 mb-3">
                            {vote.question}
                          </p>
                          
                          <div className="space-y-2">
                            {vote.options.map((option) => (
                              <label key={option} className="flex items-center">
                                <input 
                                  type="radio" 
                                  name={`vote-${vote.id}`} 
                                  value={option}
                                  className="text-blue-600 focus:ring-blue-500"
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      castVoteMutation.mutate({ 
                                        voteId: vote.id, 
                                        option 
                                      });
                                    }
                                  }}
                                />
                                <span className="ml-2 text-blue-800">{option}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Participants Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Participants ({participants?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {participants?.map((participant: any) => (
                      <div key={participant.userId} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Avatar>
                          <AvatarFallback>
                            {getInitials(participant.user.firstName, participant.user.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {participant.user.firstName} {participant.user.lastName}
                          </p>
                          <p className={`text-sm ${participant.isPresent ? 'text-green-600' : 'text-gray-500'}`}>
                            {participant.isPresent ? '✓ Présent' : 'Absent'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>

      {/* Participants Modal */}
      <ParticipantsModal
        isOpen={showParticipantsModal}
        onClose={() => setShowParticipantsModal(false)}
        meetingId={parseInt(id!)}
        meetingTitle={meeting.title}
      />
    </div>
  );
}
