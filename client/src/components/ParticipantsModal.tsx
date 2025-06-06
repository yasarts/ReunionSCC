import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Check, X, UserX, UserCheck, Building2, Plus, Trash2 } from "lucide-react";
import type { User, Company } from "@shared/schema";

interface Participant {
  meetingId: number;
  userId: number;
  status: 'invited' | 'present' | 'absent' | 'excused' | 'proxy';
  proxyCompanyId?: number;
  user: User;
  proxyCompany?: Company;
}

interface ParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: number;
  meetingTitle: string;
}

const statusColors = {
  invited: "bg-gray-100 text-gray-800",
  present: "bg-green-100 text-green-800",
  absent: "bg-red-100 text-red-800",
  excused: "bg-yellow-100 text-yellow-800",
  proxy: "bg-blue-100 text-blue-800",
};

const statusLabels = {
  invited: "Invité",
  present: "Présent",
  absent: "Absent", 
  excused: "Excusé",
  proxy: "Pouvoir",
};

export function ParticipantsModal({ isOpen, onClose, meetingId, meetingTitle }: ParticipantsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());

  // Récupérer tous les utilisateurs (temporaire - en attendant la correction de l'authentification)
  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isOpen,
  });

  // Récupérer toutes les entreprises
  const { data: companies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  // Récupérer les participants actuels
  const { data: participants, isLoading } = useQuery<Participant[]>({
    queryKey: [`/api/meetings/${meetingId}/participants`],
    enabled: isOpen && !!meetingId,
  });

  // Mutation pour ajouter des participants
  const addParticipantsMutation = useMutation({
    mutationFn: async (userIds: number[]) => {
      const promises = userIds.map(userId =>
        apiRequest(`/api/meetings/${meetingId}/participants`, "POST", { userId })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/meetings/${meetingId}/participants`] });
      setSelectedUsers(new Set());
      toast({
        title: "Participants ajoutés",
        description: "Les participants ont été ajoutés avec succès.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter les participants.",
        variant: "destructive",
      });
    },
  });

  // Mutation pour supprimer un participant
  const removeParticipantMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest(`/api/meetings/${meetingId}/participants/${userId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/meetings/${meetingId}/participants`] });
      toast({
        title: "Participant supprimé",
        description: "Le participant a été retiré de la réunion.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le participant.",
        variant: "destructive",
      });
    },
  });

  // Mutation pour mettre à jour le statut d'un participant
  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, status, proxyCompanyId }: { userId: number; status: string; proxyCompanyId?: number }) => {
      await apiRequest(`/api/meetings/${meetingId}/participants/${userId}/status`, "PUT", { status, proxyCompanyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/meetings/${meetingId}/participants`] });
      toast({
        title: "Statut mis à jour",
        description: "Le statut du participant a été modifié.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut.",
        variant: "destructive",
      });
    },
  });

  const handleUserSelection = (userId: number, checked: boolean) => {
    const newSelection = new Set(selectedUsers);
    if (checked) {
      newSelection.add(userId);
    } else {
      newSelection.delete(userId);
    }
    setSelectedUsers(newSelection);
  };

  const handleAddParticipants = () => {
    if (selectedUsers.size > 0) {
      addParticipantsMutation.mutate(Array.from(selectedUsers));
    }
  };

  const handleStatusChange = (userId: number, status: string) => {
    updateStatusMutation.mutate({ userId, status });
  };

  const handleProxyCompanyChange = (userId: number, proxyCompanyId: string) => {
    const companyId = proxyCompanyId === "none" ? undefined : parseInt(proxyCompanyId);
    updateStatusMutation.mutate({ 
      userId, 
      status: 'proxy',
      proxyCompanyId: companyId 
    });
  };

  // Filtrer les utilisateurs non participants
  const participantUserIds = new Set(participants?.map(p => p.userId) || []);
  const availableUsers = allUsers?.filter(user => !participantUserIds.has(user.id)) || [];

  // Statistiques
  const stats = {
    total: participants?.length || 0,
    present: participants?.filter(p => p.status === 'present').length || 0,
    absent: participants?.filter(p => p.status === 'absent').length || 0,
    excused: participants?.filter(p => p.status === 'excused').length || 0,
    proxy: participants?.filter(p => p.status === 'proxy').length || 0,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestion des participants - {meetingTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-6">
          {/* Statistiques */}
          <div className="grid grid-cols-5 gap-3">
            <Card className="p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-xs text-gray-600">Total</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.present}</div>
              <div className="text-xs text-gray-600">Présents</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
              <div className="text-xs text-gray-600">Absents</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.excused}</div>
              <div className="text-xs text-gray-600">Excusés</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.proxy}</div>
              <div className="text-xs text-gray-600">Pouvoirs</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden">
            {/* Section d'ajout de participants */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Ajouter des participants</h3>
                {selectedUsers.size > 0 && (
                  <Button 
                    onClick={handleAddParticipants}
                    disabled={addParticipantsMutation.isPending}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter ({selectedUsers.size})
                  </Button>
                )}
              </div>

              <ScrollArea className="h-64 border rounded-lg p-3">
                {availableUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>Tous les utilisateurs sont déjà participants</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableUsers.map((user) => (
                      <div key={user.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                        <Checkbox
                          checked={selectedUsers.has(user.id)}
                          onCheckedChange={(checked) => handleUserSelection(user.id, checked as boolean)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {user.role}
                            </Badge>
                            {user.companyId && companies && (
                              <div className="flex items-center gap-1">
                                <Building2 className="h-3 w-3 text-blue-500" />
                                <span className="text-xs text-blue-600">
                                  {companies.find(c => c.id === user.companyId)?.name || 'Structure inconnue'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Liste des participants actuels */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Participants actuels ({stats.total})</h3>
              
              <ScrollArea className="h-64 border rounded-lg p-3">
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-16 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : participants?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <UserX className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>Aucun participant pour cette réunion</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {participants?.map((participant) => (
                      <Card key={participant.userId} className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-medium text-sm">
                                {participant.user.firstName} {participant.user.lastName}
                              </p>
                              <Badge className={statusColors[participant.status]} variant="secondary">
                                {statusLabels[participant.status]}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 mb-1">{participant.user.email}</p>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {participant.user.role}
                              </Badge>
                              {participant.user.companyId && companies && (
                                <div className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3 text-blue-500" />
                                  <span className="text-xs text-blue-600">
                                    {companies.find(c => c.id === participant.user.companyId)?.name || 'Structure inconnue'}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {/* Sélecteur de statut */}
                            <div className="flex items-center gap-2 mb-2">
                              <Select
                                value={participant.status}
                                onValueChange={(value) => handleStatusChange(participant.userId, value)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="invited">Invité</SelectItem>
                                  <SelectItem value="present">Présent</SelectItem>
                                  <SelectItem value="absent">Absent</SelectItem>
                                  <SelectItem value="excused">Excusé</SelectItem>
                                  <SelectItem value="proxy">Pouvoir</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Sélecteur d'entreprise pour les pouvoirs */}
                            {participant.status === 'proxy' && (
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-gray-400" />
                                <Select
                                  value={participant.proxyCompanyId?.toString() || "none"}
                                  onValueChange={(value) => handleProxyCompanyChange(participant.userId, value)}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Choisir une entreprise" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Aucune entreprise</SelectItem>
                                    {companies?.map((company) => (
                                      <SelectItem key={company.id} value={company.id.toString()}>
                                        {company.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {participant.proxyCompany && (
                              <div className="flex items-center gap-1 mt-1">
                                <Building2 className="h-3 w-3 text-blue-500" />
                                <span className="text-xs text-blue-600">
                                  Pouvoir donné à: {participant.proxyCompany.name}
                                </span>
                              </div>
                            )}
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeParticipantMutation.mutate(participant.userId)}
                            disabled={removeParticipantMutation.isPending}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}