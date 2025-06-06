import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Building2, UserCheck, UserX, ArrowRight, Plus, Trash2 } from "lucide-react";
import type { User, Company } from "@shared/schema";

interface Participant {
  meetingId: number;
  userId: number;
  status: 'invited' | 'present' | 'absent' | 'excused' | 'proxy';
  proxyCompanyId?: number;
  user: User;
  proxyCompany?: Company;
}

interface ParticipantsManagementProps {
  meetingId: number;
}

interface CompanyParticipation {
  company: Company;
  status: 'present' | 'absent' | 'excused' | 'proxy';
  representatives: User[];
  proxyToCompany?: Company;
  proxiesReceived?: Company[]; // Entreprises ayant donné leur pouvoir à cette entreprise
}

const statusColors = {
  present: "bg-green-100 text-green-800",
  absent: "bg-red-100 text-red-800",
  excused: "bg-yellow-100 text-yellow-800",
  proxy: "bg-blue-100 text-blue-800",
};

const statusLabels = {
  present: "Présente",
  absent: "Absente", 
  excused: "Excusée",
  proxy: "Pouvoir donné",
};

export function ParticipantsManagement({ meetingId }: ParticipantsManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [companyParticipations, setCompanyParticipations] = useState<Map<number, CompanyParticipation>>(new Map());

  // Récupérer tous les utilisateurs
  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Récupérer toutes les entreprises
  const { data: companies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  // Récupérer les participants actuels
  const { data: participants, isLoading } = useQuery<Participant[]>({
    queryKey: [`/api/meetings/${meetingId}/participants`],
    enabled: !!meetingId,
  });

  // Initialiser les participations par entreprise
  useEffect(() => {
    if (companies && participants && allUsers) {
      const newCompanyParticipations = new Map<number, CompanyParticipation>();
      
      // Grouper les participants par entreprise
      const participantsByCompany = new Map<number, Participant[]>();
      participants.forEach(participant => {
        const companyId = participant.user.companyId;
        if (companyId) {
          if (!participantsByCompany.has(companyId)) {
            participantsByCompany.set(companyId, []);
          }
          participantsByCompany.get(companyId)!.push(participant);
        }
      });

      // Créer les objets CompanyParticipation
      companies.forEach(company => {
        const companyParticipants = participantsByCompany.get(company.id) || [];
        
        if (companyParticipants.length > 0) {
          // Déterminer le statut de l'entreprise basé sur ses participants
          const hasPresent = companyParticipants.some(p => p.status === 'present');
          const hasProxy = companyParticipants.some(p => p.status === 'proxy');
          const hasExcused = companyParticipants.some(p => p.status === 'excused');
          
          let status: CompanyParticipation['status'] = 'absent';
          if (hasPresent) status = 'present';
          else if (hasProxy) status = 'proxy';
          else if (hasExcused) status = 'excused';

          const proxyParticipant = companyParticipants.find(p => p.status === 'proxy');
          
          // Calculer les pouvoirs reçus par cette entreprise
          const proxiesReceived: Company[] = [];
          participants?.forEach(participant => {
            if (participant.status === 'proxy' && 
                participant.proxyCompany?.id === company.id &&
                participant.user.companyId !== company.id) {
              const senderCompany = companies.find(c => c.id === participant.user.companyId);
              if (senderCompany && !proxiesReceived.find(p => p.id === senderCompany.id)) {
                proxiesReceived.push(senderCompany);
              }
            }
          });
          
          newCompanyParticipations.set(company.id, {
            company,
            status,
            representatives: companyParticipants.map(p => p.user),
            proxyToCompany: proxyParticipant?.proxyCompany,
            proxiesReceived
          });
        }
      });

      setCompanyParticipations(newCompanyParticipations);
    }
  }, [companies, participants, allUsers]);

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

  // Mutation pour mettre à jour le statut d'un participant
  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, status, proxyCompanyId }: { userId: number; status: string; proxyCompanyId?: number }) => {
      await apiRequest(`/api/meetings/${meetingId}/participants/${userId}/status`, "PUT", { status, proxyCompanyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/meetings/${meetingId}/participants`] });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut.",
        variant: "destructive",
      });
    },
  });

  const handleCompanyStatusChange = async (companyId: number, newStatus: CompanyParticipation['status']) => {
    const participation = companyParticipations.get(companyId);
    const company = companies?.find(c => c.id === companyId);
    if (!company) return;

    // Si l'entreprise n'a pas encore de participants, ajouter le premier utilisateur de l'entreprise
    if (!participation || participation.representatives.length === 0) {
      const companyUsers = allUsers?.filter(user => user.companyId === companyId);
      if (companyUsers && companyUsers.length > 0) {
        try {
          // Ajouter le premier utilisateur comme participant
          await addParticipantsMutation.mutateAsync([companyUsers[0].id]);
          // Ensuite mettre à jour le statut
          updateStatusMutation.mutate({ userId: companyUsers[0].id, status: newStatus });
        } catch (error) {
          console.error('Error adding participant:', error);
          return;
        }
      }
    } else {
      // Mettre à jour le statut local
      const updatedParticipation = { ...participation, status: newStatus };
      const newMap = new Map(companyParticipations);
      newMap.set(companyId, updatedParticipation);
      setCompanyParticipations(newMap);

      // Mettre à jour tous les participants de cette entreprise
      participation.representatives.forEach(user => {
        updateStatusMutation.mutate({ userId: user.id, status: newStatus });
      });
    }
  };

  const handleAddRepresentative = (companyId: number, userId: number) => {
    const user = allUsers?.find(u => u.id === userId);
    if (!user) return;

    // Ajouter le participant
    addParticipantsMutation.mutate([userId]);

    // Mettre à jour localement
    const participation = companyParticipations.get(companyId);
    if (participation) {
      const updatedParticipation = {
        ...participation,
        representatives: [...participation.representatives, user]
      };
      const newMap = new Map(companyParticipations);
      newMap.set(companyId, updatedParticipation);
      setCompanyParticipations(newMap);
    } else {
      // Créer une nouvelle participation d'entreprise
      const company = companies?.find(c => c.id === companyId);
      if (company) {
        const newMap = new Map(companyParticipations);
        newMap.set(companyId, {
          company,
          status: 'present',
          representatives: [user]
        });
        setCompanyParticipations(newMap);
      }
    }
  };

  const handleProxyChange = (companyId: number, proxyCompanyId: number | null) => {
    const participation = companyParticipations.get(companyId);
    if (!participation) return;

    const proxyCompany = proxyCompanyId ? companies?.find(c => c.id === proxyCompanyId) : undefined;
    
    const updatedParticipation = {
      ...participation,
      proxyToCompany: proxyCompany,
      status: 'proxy' as const
    };
    
    const newMap = new Map(companyParticipations);
    newMap.set(companyId, updatedParticipation);
    setCompanyParticipations(newMap);

    // Mettre à jour les participants
    participation.representatives.forEach(user => {
      updateStatusMutation.mutate({ 
        userId: user.id, 
        status: 'proxy',
        proxyCompanyId: proxyCompanyId || undefined
      });
    });
  };

  const getAvailableUsersForCompany = (companyId: number) => {
    const companyUsers = allUsers?.filter(user => user.companyId === companyId) || [];
    const participation = companyParticipations.get(companyId);
    const representativeIds = new Set(participation?.representatives.map(r => r.id) || []);
    
    return companyUsers.filter(user => !representativeIds.has(user.id));
  };

  const getParticipatingCompanies = () => {
    return Array.from(companyParticipations.values()).sort((a, b) => a.company.name.localeCompare(b.company.name));
  };

  const getNonParticipatingCompanies = () => {
    if (!companies) return [];
    return companies.filter(company => !companyParticipations.has(company.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gestion des Participants</h2>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-100 rounded"></div>
            Présentes: {Array.from(companyParticipations.values()).filter(p => p.status === 'present').length}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-100 rounded"></div>
            Absentes: {Array.from(companyParticipations.values()).filter(p => p.status === 'absent').length}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-100 rounded"></div>
            Excusées: {Array.from(companyParticipations.values()).filter(p => p.status === 'excused').length}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-100 rounded"></div>
            Pouvoirs: {Array.from(companyParticipations.values()).filter(p => p.status === 'proxy').length}
          </span>
        </div>
      </div>

      {/* Entreprises participantes */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Entreprises Participantes</h3>
        {getParticipatingCompanies().map((participation) => (
          <Card key={participation.company.id} className="p-4">
            <div className="space-y-4">
              {/* En-tête de l'entreprise */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-blue-500" />
                  <h4 className="font-semibold">{participation.company.name}</h4>
                  <Badge className={statusColors[participation.status]} variant="secondary">
                    {statusLabels[participation.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={participation.status}
                    onValueChange={(value: CompanyParticipation['status']) => 
                      handleCompanyStatusChange(participation.company.id, value)
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Présente</SelectItem>
                      <SelectItem value="absent">Absente</SelectItem>
                      <SelectItem value="excused">Excusée</SelectItem>
                      <SelectItem value="proxy">Pouvoir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Gestion des pouvoirs */}
              {participation.status === 'proxy' && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium">Pouvoir donné à:</span>
                  <Select
                    value={participation.proxyToCompany?.id.toString() || ""}
                    onValueChange={(value) => handleProxyChange(participation.company.id, value ? parseInt(value) : null)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Choisir une entreprise" />
                    </SelectTrigger>
                    <SelectContent>
                      {getParticipatingCompanies()
                        .filter(p => p.company.id !== participation.company.id && p.status === 'present')
                        .map((p) => (
                          <SelectItem key={p.company.id} value={p.company.id.toString()}>
                            {p.company.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {participation.proxyToCompany && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <ArrowRight className="h-4 w-4" />
                      <span className="text-sm">{participation.proxyToCompany.name}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Pouvoirs reçus */}
              {participation.status === 'present' && participation.proxiesReceived && participation.proxiesReceived.length > 0 && (
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <h5 className="text-sm font-medium text-indigo-800 mb-2">
                    Pouvoirs reçus ({participation.proxiesReceived.length})
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {participation.proxiesReceived.map((proxyCompany) => (
                      <Badge key={proxyCompany.id} variant="secondary" className="bg-indigo-100 text-indigo-800">
                        {proxyCompany.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Représentants de l'entreprise */}
              {participation.status === 'present' && (
                <div className="space-y-3">
                  <h5 className="text-sm font-medium text-gray-700">Représentants ({participation.representatives.length})</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {participation.representatives.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                          <Badge variant="outline" className="text-xs">{user.role}</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Retirer le représentant
                            const updatedParticipation = {
                              ...participation,
                              representatives: participation.representatives.filter(r => r.id !== user.id)
                            };
                            const newMap = new Map(companyParticipations);
                            if (updatedParticipation.representatives.length === 0) {
                              newMap.delete(participation.company.id);
                            } else {
                              newMap.set(participation.company.id, updatedParticipation);
                            }
                            setCompanyParticipations(newMap);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Ajouter un représentant */}
                  {getAvailableUsersForCompany(participation.company.id).length > 0 && (
                    <div className="flex items-center gap-2">
                      <Select onValueChange={(value) => handleAddRepresentative(participation.company.id, parseInt(value))}>
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Ajouter un représentant" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableUsersForCompany(participation.company.id).map((user) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.firstName} {user.lastName} - {user.role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Entreprises non participantes */}
      {getNonParticipatingCompanies().length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Entreprises Non Participantes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getNonParticipatingCompanies().map((company) => (
              <Card key={company.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{company.name}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const companyUsers = allUsers?.filter(user => user.companyId === company.id) || [];
                      if (companyUsers.length > 0) {
                        // Ajouter le premier utilisateur comme représentant
                        handleAddRepresentative(company.id, companyUsers[0].id);
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {allUsers?.filter(user => user.companyId === company.id).length || 0} utilisateur(s)
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}