import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Trash2, Users, Plus } from "lucide-react";
import type { User, Company } from "@shared/schema";

interface IntegratedParticipantsManagementProps {
  meetingId: number;
}

interface Participant {
  meetingId: number;
  userId: number;
  status: 'invited' | 'present' | 'absent' | 'excused' | 'proxy';
  proxyCompanyId?: number;
  user: User;
  proxyCompany?: Company;
}

interface CompanyParticipation {
  company: Company;
  status: 'present' | 'absent' | 'excused' | 'proxy';
  representatives: User[];
  proxyToCompany?: Company;
}

export function IntegratedParticipantsManagement({ meetingId }: IntegratedParticipantsManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('present');
  const [selectedProxyCompanyId, setSelectedProxyCompanyId] = useState<number | null>(null);

  // Récupérer les données
  const { data: companies } = useQuery<Company[]>({ queryKey: ["/api/companies"] });
  const { data: allUsers } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { data: participants } = useQuery<Participant[]>({ 
    queryKey: [`/api/meetings/${meetingId}/participants`] 
  });

  // Mutation pour ajouter participant avec statut
  const addParticipantMutation = useMutation({
    mutationFn: async ({ userId, status, proxyCompanyId }: { userId: number; status: string; proxyCompanyId?: number }) => {
      console.log(`[IntegratedManagement] Adding participant: userId=${userId}, status=${status}, proxyCompanyId=${proxyCompanyId}`);
      await apiRequest("POST", `/api/meetings/${meetingId}/participants/with-status`, { userId, status, proxyCompanyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/meetings/${meetingId}/participants`] });
      toast({
        title: "Succès",
        description: "Participant ajouté avec succès.",
      });
      setSelectedCompanyId(null);
    },
    onError: (error) => {
      console.error('Error adding participant:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le participant.",
        variant: "destructive",
      });
    },
  });

  // Mutation pour mettre à jour le statut
  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, status, proxyCompanyId }: { userId: number; status: string; proxyCompanyId?: number }) => {
      await apiRequest("PUT", `/api/meetings/${meetingId}/participants/${userId}/status`, { status, proxyCompanyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/meetings/${meetingId}/participants`] });
      toast({
        title: "Succès",
        description: "Statut mis à jour avec succès.",
      });
    },
    onError: (error) => {
      console.error('Error updating status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut.",
        variant: "destructive",
      });
    },
  });

  // Mutation pour supprimer participant
  const removeParticipantMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/meetings/${meetingId}/participants/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/meetings/${meetingId}/participants`] });
      toast({
        title: "Succès",
        description: "Participant retiré avec succès.",
      });
    },
    onError: (error) => {
      console.error('Error removing participant:', error);
      toast({
        title: "Erreur",
        description: "Impossible de retirer le participant.",
        variant: "destructive",
      });
    },
  });

  // Organiser les participants par entreprise et statut
  const companiesByStatus = {
    present: new Map<number, CompanyParticipation>(),
    absent: new Map<number, CompanyParticipation>(),
    excused: new Map<number, CompanyParticipation>(),
    proxy: new Map<number, CompanyParticipation>(),
  };

  participants?.forEach(participant => {
    const companyId = participant.user.companyId;
    if (!companyId) return;
    
    const company = companies?.find(c => c.id === companyId);
    if (!company) return;
    
    const status = participant.status === 'invited' ? 'present' : participant.status;
    const statusMap = companiesByStatus[status as keyof typeof companiesByStatus];
    
    if (!statusMap.has(companyId)) {
      statusMap.set(companyId, {
        company,
        status: status as any,
        representatives: [],
        proxyToCompany: participant.proxyCompany
      });
    }
    
    statusMap.get(companyId)!.representatives.push(participant.user);
  });

  // Entreprises non participantes
  const nonParticipatingCompanies = companies?.filter(company => 
    !Array.from(Object.values(companiesByStatus)).some(statusMap => statusMap.has(company.id)) &&
    allUsers?.some(user => user.companyId === company.id)
  ) || [];

  // Entreprises présentes (pour les mandats)
  const presentCompanies = Array.from(companiesByStatus.present.values()).map(cp => cp.company);

  // Calculer les mandats reçus par chaque entreprise présente
  const mandatesReceived = new Map<number, Company[]>();
  
  // Parcourir toutes les entreprises donnant mandat
  Array.from(companiesByStatus.proxy.values()).forEach(proxyParticipation => {
    if (proxyParticipation.proxyToCompany) {
      const receivingCompanyId = proxyParticipation.proxyToCompany.id;
      if (!mandatesReceived.has(receivingCompanyId)) {
        mandatesReceived.set(receivingCompanyId, []);
      }
      mandatesReceived.get(receivingCompanyId)!.push(proxyParticipation.company);
    }
  });

  const handleAddCompany = () => {
    if (!selectedCompanyId) return;
    
    const companyUsers = allUsers?.filter(user => user.companyId === selectedCompanyId);
    if (companyUsers && companyUsers.length > 0) {
      addParticipantMutation.mutate({
        userId: companyUsers[0].id,
        status: selectedStatus,
        proxyCompanyId: selectedStatus === 'proxy' && selectedProxyCompanyId ? selectedProxyCompanyId : undefined
      });
    }
  };

  const handleAddRepresentative = (companyId: number, userId: number) => {
    const participation = companiesByStatus.present.get(companyId);
    if (participation) {
      addParticipantMutation.mutate({
        userId,
        status: 'present'
      });
    }
  };

  const handleProxyAssignment = (fromCompanyId: number, toCompanyId: number) => {
    const fromParticipation = companiesByStatus.present.get(fromCompanyId);
    if (fromParticipation && fromParticipation.representatives.length > 0) {
      updateStatusMutation.mutate({
        userId: fromParticipation.representatives[0].id,
        status: 'proxy',
        proxyCompanyId: toCompanyId
      });
    }
  };

  const renderCompanyCard = (participation: CompanyParticipation, showProxyOptions = false) => (
    <Card key={participation.company.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">{participation.company.name}</CardTitle>
            <Badge variant={participation.status === 'present' ? 'default' : 'secondary'}>
              {participation.status === 'present' ? 'Présente' : 
               participation.status === 'absent' ? 'Absente' : 
               participation.status === 'excused' ? 'Excusée' : 
               participation.status === 'proxy' ? 'Donne pouvoir' : participation.status}
            </Badge>
            {participation.proxyToCompany && (
              <Badge variant="outline" className="bg-purple-50">
                Pouvoir à {participation.proxyToCompany.name}
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              participation.representatives.forEach(user => {
                removeParticipantMutation.mutate(user.id);
              });
            }}
            disabled={removeParticipantMutation.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Représentants */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">
              Représentants ({participation.representatives.length})
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                    onClick={() => removeParticipantMutation.mutate(user.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            {/* Ajouter un représentant */}
            {participation.status === 'present' && (
              <div className="mt-2">
                <Select onValueChange={(value) => handleAddRepresentative(participation.company.id, parseInt(value))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Ajouter un représentant..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers?.filter(user => 
                      user.companyId === participation.company.id && 
                      !participation.representatives.some(rep => rep.id === user.id)
                    ).map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.firstName} {user.lastName} - {user.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Affichage des mandats reçus - pour les entreprises présentes */}
          {participation.status === 'present' && mandatesReceived.has(participation.company.id) && (
            <div className="pt-3 border-t border-gray-200">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Mandats reçus</h5>
              <div className="flex flex-wrap gap-2">
                {mandatesReceived.get(participation.company.id)!.map((delegatingCompany) => (
                  <Badge key={delegatingCompany.id} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {delegatingCompany.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Gestion des mandats - pour les entreprises donnant mandat */}
          {participation.status === 'proxy' && (
            <div className="pt-3 border-t border-gray-200">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Mandat donné à</h5>
              <div className="flex items-center gap-2">
                <Select 
                  value={participation.proxyToCompany?.id?.toString() || ""} 
                  onValueChange={(value) => {
                    const newProxyCompanyId = parseInt(value);
                    // Mettre à jour le mandat
                    updateStatusMutation.mutate({
                      userId: participation.representatives[0]?.id,
                      status: 'proxy',
                      proxyCompanyId: newProxyCompanyId
                    });
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Sélectionner l'entreprise mandatée..." />
                  </SelectTrigger>
                  <SelectContent>
                    {presentCompanies.filter(c => c.id !== participation.company.id).map((company) => (
                      <SelectItem key={company.id} value={company.id.toString()}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Changer le statut en présent (enlever le mandat)
                    updateStatusMutation.mutate({
                      userId: participation.representatives[0]?.id,
                      status: 'present',
                      proxyCompanyId: undefined
                    });
                  }}
                  title="Annuler le mandat"
                >
                  ✕
                </Button>
              </div>
            </div>
          )}

          {/* Gestion des pouvoirs - pour les entreprises présentes */}
          {showProxyOptions && participation.status === 'present' && (
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Donner pouvoir à</h5>
              <Select onValueChange={(value) => handleProxyAssignment(participation.company.id, parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une entreprise..." />
                </SelectTrigger>
                <SelectContent>
                  {presentCompanies.filter(c => c.id !== participation.company.id).map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Conversion en array pour les statistiques et l'affichage
  const allParticipations = [
    ...Array.from(companiesByStatus.present.values()),
    ...Array.from(companiesByStatus.proxy.values()),
    ...Array.from(companiesByStatus.excused.values()),
    ...Array.from(companiesByStatus.absent.values())
  ];

  // Calcul des statistiques
  const stats = allParticipations.reduce((acc: {present: number, proxy: number, excused: number, absent: number}, participation: CompanyParticipation) => {
    switch (participation.status) {
      case 'present':
        acc.present++;
        break;
      case 'proxy':
        acc.proxy++;
        break;
      case 'excused':
        acc.excused++;
        break;
      case 'absent':
        acc.absent++;
        break;
    }
    return acc;
  }, { present: 0, proxy: 0, excused: 0, absent: 0 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gestion des participants</h2>
        
        {/* Compteur des statuts */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{stats.present}</div>
              <div className="text-gray-600">Présentes</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">{stats.proxy}</div>
              <div className="text-gray-600">Mandats</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600">{stats.excused}</div>
              <div className="text-gray-600">Excusées</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">{stats.absent}</div>
              <div className="text-gray-600">Absentes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Section d'ajout */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Ajouter une entreprise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Entreprise</label>
              <Select value={selectedCompanyId?.toString() || ""} onValueChange={(value) => setSelectedCompanyId(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une entreprise..." />
                </SelectTrigger>
                <SelectContent>
                  {nonParticipatingCompanies.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Statut</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Présente</SelectItem>
                  <SelectItem value="absent">Absente</SelectItem>
                  <SelectItem value="excused">Excusée</SelectItem>
                  <SelectItem value="proxy">Donne un pouvoir</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedStatus === 'proxy' && (
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">Donner pouvoir à</label>
                <Select value={selectedProxyCompanyId?.toString() || ""} onValueChange={(value) => setSelectedProxyCompanyId(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une entreprise..." />
                  </SelectTrigger>
                  <SelectContent>
                    {presentCompanies.filter(c => c.id !== selectedCompanyId).map((company) => (
                      <SelectItem key={company.id} value={company.id.toString()}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button 
              onClick={handleAddCompany}
              disabled={!selectedCompanyId || addParticipantMutation.isPending || (selectedStatus === 'proxy' && !selectedProxyCompanyId)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Entreprises présentes */}
      <div>
        <h3 className="text-xl font-semibold mb-4 text-green-700">
          Entreprises présentes ({companiesByStatus.present.size})
        </h3>
        {companiesByStatus.present.size === 0 ? (
          <p className="text-gray-500 italic">Aucune entreprise présente</p>
        ) : (
          Array.from(companiesByStatus.present.values()).map(participation => 
            renderCompanyCard(participation, false)
          )
        )}
      </div>

      {/* Entreprises donnant mandat */}
      <div>
        <h3 className="text-xl font-semibold mb-4 text-purple-700">
          Entreprises donnant mandat ({companiesByStatus.proxy.size})
        </h3>
        {companiesByStatus.proxy.size === 0 ? (
          <p className="text-gray-500 italic">Aucune entreprise donnant mandat</p>
        ) : (
          Array.from(companiesByStatus.proxy.values()).map(participation => 
            renderCompanyCard(participation, true)
          )
        )}
      </div>

      {/* Entreprises absentes */}
      <div>
        <h3 className="text-xl font-semibold mb-4 text-red-700">
          Entreprises absentes ({companiesByStatus.absent.size})
        </h3>
        {companiesByStatus.absent.size === 0 ? (
          <p className="text-gray-500 italic">Aucune entreprise absente</p>
        ) : (
          Array.from(companiesByStatus.absent.values()).map(participation => 
            renderCompanyCard(participation, false)
          )
        )}
      </div>

      {/* Entreprises excusées */}
      <div>
        <h3 className="text-xl font-semibold mb-4 text-orange-700">
          Entreprises excusées ({companiesByStatus.excused.size})
        </h3>
        {companiesByStatus.excused.size === 0 ? (
          <p className="text-gray-500 italic">Aucune entreprise excusée</p>
        ) : (
          Array.from(companiesByStatus.excused.values()).map(participation => 
            renderCompanyCard(participation, false)
          )
        )}
      </div>
    </div>
  );
}