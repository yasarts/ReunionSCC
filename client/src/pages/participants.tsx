import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Users, UserCheck, UserX, UserMinus, ArrowRightLeft } from "lucide-react";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  structure: string | null;
}

interface Participant {
  meetingId: number;
  userId: number;
  status: string;
  proxyToUserId: number | null;
  proxyToStructure: string | null;
  updatedAt: string;
  updatedBy: number | null;
  user: User;
}

interface Meeting {
  id: number;
  title: string;
  date: string;
  status: string;
}

const statusLabels = {
  pending: "En attente",
  present: "Présent",
  absent: "Absent",
  excused: "Excusé",
  proxy: "Pouvoir donné"
};

const statusColors = {
  pending: "secondary",
  present: "default",
  absent: "destructive",
  excused: "outline",
  proxy: "default"
} as const;

export default function ParticipantsManagement() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [selectedStructures, setSelectedStructures] = useState<Record<number, string>>({});

  const meetingId = parseInt(id || "0");

  // Récupérer les données de la réunion
  const { data: meeting } = useQuery<Meeting>({
    queryKey: ["/api/meetings", meetingId],
    enabled: !!meetingId
  });

  // Récupérer les participants de la réunion
  const { data: participants = [], isLoading: loadingParticipants } = useQuery<Participant[]>({
    queryKey: ["/api/meetings", meetingId, "participants"],
    enabled: !!meetingId
  });

  // Récupérer tous les élus
  const { data: electedMembers = [] } = useQuery<User[]>({
    queryKey: ["/api/users/elected"],
  });

  // Récupérer les structures disponibles
  const { data: structures = [] } = useQuery<string[]>({
    queryKey: ["/api/structures"],
  });

  // Mutation pour mettre à jour le statut d'un participant
  const updateStatusMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      status, 
      proxyToUserId, 
      proxyToStructure 
    }: { 
      userId: number; 
      status: string; 
      proxyToUserId?: number; 
      proxyToStructure?: string; 
    }) => {
      const response = await fetch(`/api/meetings/${meetingId}/participants/${userId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status,
          proxyToUserId,
          proxyToStructure,
          updatedBy: currentUser?.id
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId, "participants"] });
      toast({
        title: "Statut mis à jour",
        description: "Le statut du participant a été mis à jour avec succès."
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut du participant.",
        variant: "destructive"
      });
    }
  });

  const handleStatusChange = (userId: number, newStatus: string) => {
    const selectedStructure = selectedStructures[userId];
    
    if (newStatus === "proxy" && !selectedStructure) {
      toast({
        title: "Structure requise",
        description: "Veuillez sélectionner une structure pour le pouvoir.",
        variant: "destructive"
      });
      return;
    }

    // Trouver l'utilisateur de la structure sélectionnée pour le pouvoir
    let proxyToUserId = undefined;
    if (newStatus === "proxy" && selectedStructure) {
      const proxyUser = electedMembers.find(member => 
        member.structure === selectedStructure && member.id !== userId
      );
      proxyToUserId = proxyUser?.id;
    }

    updateStatusMutation.mutate({
      userId,
      status: newStatus,
      proxyToUserId,
      proxyToStructure: newStatus === "proxy" ? selectedStructure : undefined
    });
  };

  const getAvailableStructuresForProxy = (currentUserId: number) => {
    const currentUser = electedMembers.find(member => member.id === currentUserId);
    if (!currentUser?.structure) return structures;
    
    // Exclure la structure de l'utilisateur actuel
    return structures.filter(structure => structure !== currentUser.structure);
  };

  const canManageParticipants = currentUser?.permissions?.canManageParticipants || 
                                currentUser?.role === "Salarié·es SCC";

  if (!meeting) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Réunion non trouvée</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Gestion des Participants</h1>
        <p className="text-muted-foreground mb-4">{meeting.title}</p>
        <p className="text-sm text-muted-foreground">
          Date: {new Date(meeting.date).toLocaleDateString("fr-FR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
          })}
        </p>
      </div>

      <div className="grid gap-6">
        {/* Statistiques */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Résumé des Participations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {participants.filter(p => p.status === "present").length}
                </div>
                <div className="text-sm text-muted-foreground">Présents</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {participants.filter(p => p.status === "absent").length}
                </div>
                <div className="text-sm text-muted-foreground">Absents</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {participants.filter(p => p.status === "excused").length}
                </div>
                <div className="text-sm text-muted-foreground">Excusés</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {participants.filter(p => p.status === "proxy").length}
                </div>
                <div className="text-sm text-muted-foreground">Pouvoirs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {participants.filter(p => p.status === "pending").length}
                </div>
                <div className="text-sm text-muted-foreground">En attente</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des participants */}
        <Card>
          <CardHeader>
            <CardTitle>Élus du Conseil National</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingParticipants ? (
              <div className="text-center py-8">Chargement...</div>
            ) : (
              <div className="space-y-4">
                {participants.map((participant) => (
                  <div
                    key={participant.userId}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <h3 className="font-semibold">
                            {participant.user.firstName} {participant.user.lastName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {participant.user.structure || "Structure non définie"}
                          </p>
                        </div>
                        <Badge variant={statusColors[participant.status as keyof typeof statusColors]}>
                          {statusLabels[participant.status as keyof typeof statusLabels]}
                        </Badge>
                      </div>
                      
                      {participant.status === "proxy" && participant.proxyToStructure && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                          <ArrowRightLeft className="w-4 h-4" />
                          Pouvoir donné à: {participant.proxyToStructure}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Sélection de structure pour pouvoir */}
                      {participant.status === "proxy" && (
                        <Select
                          value={selectedStructures[participant.userId] || participant.proxyToStructure || ""}
                          onValueChange={(value) => 
                            setSelectedStructures(prev => ({ ...prev, [participant.userId]: value }))
                          }
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Sélectionner une structure" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableStructuresForProxy(participant.userId).map((structure) => (
                              <SelectItem key={structure} value={structure}>
                                {structure}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {/* Boutons de statut */}
                      {(canManageParticipants || participant.userId === currentUser?.id) && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant={participant.status === "present" ? "default" : "outline"}
                            onClick={() => handleStatusChange(participant.userId, "present")}
                            disabled={updateStatusMutation.isPending}
                          >
                            <UserCheck className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={participant.status === "absent" ? "default" : "outline"}
                            onClick={() => handleStatusChange(participant.userId, "absent")}
                            disabled={updateStatusMutation.isPending}
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={participant.status === "excused" ? "default" : "outline"}
                            onClick={() => handleStatusChange(participant.userId, "excused")}
                            disabled={updateStatusMutation.isPending}
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                          
                          {/* Bouton pouvoir avec sélection de structure */}
                          <div className="flex items-center gap-1">
                            {participant.status !== "proxy" && (
                              <Select
                                value={selectedStructures[participant.userId] || ""}
                                onValueChange={(value) => 
                                  setSelectedStructures(prev => ({ ...prev, [participant.userId]: value }))
                                }
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Structure" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getAvailableStructuresForProxy(participant.userId).map((structure) => (
                                    <SelectItem key={structure} value={structure}>
                                      {structure}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            
                            <Button
                              size="sm"
                              variant={participant.status === "proxy" ? "default" : "outline"}
                              onClick={() => handleStatusChange(participant.userId, "proxy")}
                              disabled={updateStatusMutation.isPending || 
                                       (participant.status !== "proxy" && !selectedStructures[participant.userId])}
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}