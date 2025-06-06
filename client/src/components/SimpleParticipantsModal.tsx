import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User, Company } from "@shared/schema";

interface SimpleParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: number;
  meetingTitle: string;
}

interface Participant {
  meetingId: number;
  userId: number;
  status: 'invited' | 'present' | 'absent' | 'excused' | 'proxy';
  proxyCompanyId?: number;
  user: User;
  proxyCompany?: Company;
}

export function SimpleParticipantsModal({ isOpen, onClose, meetingId, meetingTitle }: SimpleParticipantsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('present');

  // Récupérer les données
  const { data: companies } = useQuery<Company[]>({ queryKey: ["/api/companies"] });
  const { data: allUsers } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { data: participants } = useQuery<Participant[]>({ 
    queryKey: [`/api/meetings/${meetingId}/participants`] 
  });

  // Mutation pour ajouter participant avec statut
  const addParticipantMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: number; status: string }) => {
      console.log(`[SimpleModal] Adding participant: userId=${userId}, status=${status}`);
      await apiRequest(`/api/meetings/${meetingId}/participants/with-status`, "POST", { userId, status });
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

  // Mutation pour supprimer participant
  const removeParticipantMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest(`/api/meetings/${meetingId}/participants/${userId}`, "DELETE");
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

  // Organiser les participants par entreprise
  const participantsByCompany = new Map<number, { company: Company; users: User[]; status: string }>();
  
  participants?.forEach(participant => {
    const companyId = participant.user.companyId;
    if (!companyId) return;
    
    const company = companies?.find(c => c.id === companyId);
    if (!company) return;
    
    if (!participantsByCompany.has(companyId)) {
      participantsByCompany.set(companyId, {
        company,
        users: [],
        status: participant.status
      });
    }
    
    participantsByCompany.get(companyId)!.users.push(participant.user);
  });

  // Entreprises non participantes
  const nonParticipatingCompanies = companies?.filter(company => 
    !participantsByCompany.has(company.id) && 
    allUsers?.some(user => user.companyId === company.id)
  ) || [];

  const handleAddCompany = () => {
    if (!selectedCompanyId) return;
    
    const companyUsers = allUsers?.filter(user => user.companyId === selectedCompanyId);
    if (companyUsers && companyUsers.length > 0) {
      addParticipantMutation.mutate({
        userId: companyUsers[0].id,
        status: selectedStatus
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestion des participants - {meetingTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Section d'ajout */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Ajouter une entreprise</h3>
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
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleAddCompany}
                disabled={!selectedCompanyId || addParticipantMutation.isPending}
              >
                Ajouter
              </Button>
            </div>
          </div>

          {/* Liste des participants */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Entreprises participantes ({participantsByCompany.size})</h3>
            {participantsByCompany.size === 0 ? (
              <p className="text-gray-500 italic">Aucune entreprise participante pour le moment</p>
            ) : (
              Array.from(participantsByCompany.entries()).map(([companyId, data]) => (
                <div key={companyId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">{data.company.name}</h4>
                      <Badge variant={data.status === 'present' ? 'default' : 'secondary'}>
                        {data.status === 'present' ? 'Présente' : 
                         data.status === 'absent' ? 'Absente' : 
                         data.status === 'excused' ? 'Excusée' : data.status}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        data.users.forEach(user => {
                          removeParticipantMutation.mutate(user.id);
                        });
                      }}
                      disabled={removeParticipantMutation.isPending}
                    >
                      Retirer
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Représentants ({data.users.length})</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {data.users.map((user) => (
                        <div key={user.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">{user.role}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}