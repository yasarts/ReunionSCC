import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Vote, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { CreateVoteModal } from "./CreateVoteModal";

interface VoteSectionProps {
  sectionId: string;
  sectionTitle: string;
  isEditMode?: boolean;
}

interface VoteData {
  id: number;
  question: string;
  options: string[];
  isOpen: boolean;
  createdAt: string;
  closedAt?: string;
  results?: {
    option: string;
    count: number;
    percentage: number;
  }[];
  userVote?: {
    option: string;
    votingForCompany?: string;
  };
  totalVotes?: number;
}

export function VoteSection({ sectionId, sectionTitle, isEditMode = false }: VoteSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Récupérer les votes pour cette section spécifique
  const { data: votes = [], isLoading, error } = useQuery<VoteData[]>({
    queryKey: [`/api/sections/${sectionId}/votes`],
    retry: false,
  });

  // Mutation pour voter
  const castVoteMutation = useMutation({
    mutationFn: async ({ voteId, option }: { voteId: number; option: string }) => {
      return await apiRequest("POST", `/api/votes/${voteId}/cast`, { 
        option,
        userId: user?.id 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${sectionId}/votes`] });
      setSelectedOption("");
      toast({
        title: "Vote enregistré",
        description: "Votre vote a été pris en compte",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors du vote",
        variant: "destructive",
      });
    }
  });

  // Mutation pour fermer un vote
  const closeVoteMutation = useMutation({
    mutationFn: async (voteId: number) => {
      return await apiRequest("POST", `/api/votes/${voteId}/close`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${sectionId}/votes`] });
      toast({
        title: "Vote fermé",
        description: "Le vote a été fermé avec succès",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la fermeture",
        variant: "destructive",
      });
    }
  });

  // Mutation pour supprimer un vote
  const deleteVoteMutation = useMutation({
    mutationFn: async (voteId: number) => {
      return await apiRequest("DELETE", `/api/votes/${voteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${sectionId}/votes`] });
      toast({
        title: "Vote supprimé",
        description: "Le vote a été supprimé avec succès",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la suppression",
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500">Chargement des votes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Erreur lors du chargement des votes: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  // Ne pas afficher la section si aucun vote et mode normal
  if (!isEditMode && (!Array.isArray(votes) || votes.length === 0)) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
          <Vote className="h-5 w-5" />
          Votes et sondages - {sectionTitle}
        </h3>
        {user && (user.permissions as any)?.canManageAgenda && (
          <Button
            onClick={() => setShowCreateModal(true)}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
          >
            Créer un vote
          </Button>
        )}
      </div>

      {(!Array.isArray(votes) || votes.length === 0) ? (
        <div className="text-center py-8">
          <Vote className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Aucun vote créé pour cette section</p>
          <p className="text-xs text-gray-400 mt-1">Utilisez le bouton "Créer un vote" pour commencer</p>
        </div>
      ) : (
        <div className="space-y-4">
          {votes.map((vote: VoteData, index: number) => (
            <Card key={vote.id} className="border-purple-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Vote className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{vote.question}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={vote.isOpen ? "default" : "secondary"}>
                          {vote.isOpen ? "Ouvert" : "Fermé"}
                        </Badge>
                        {vote.totalVotes !== undefined && (
                          <span className="text-sm text-gray-500">
                            {vote.totalVotes} vote{vote.totalVotes !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {isEditMode && (
                    <div className="flex items-center gap-2">
                      {index > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {/* TODO: Réorganiser vers le haut */}}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                      )}
                      {index < votes.length - 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {/* TODO: Réorganiser vers le bas */}}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteVoteMutation.mutate(vote.id)}
                        disabled={deleteVoteMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {vote.isOpen && !vote.userVote ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">Choisissez votre réponse :</p>
                    <div className="grid gap-2">
                      {vote.options.map((option, idx) => (
                        <Button
                          key={idx}
                          variant={selectedOption === option ? "default" : "outline"}
                          className="justify-start text-left h-auto p-3"
                          onClick={() => setSelectedOption(option)}
                        >
                          {option}
                        </Button>
                      ))}
                    </div>
                    <Button
                      onClick={() => castVoteMutation.mutate({ voteId: vote.id, option: selectedOption })}
                      disabled={!selectedOption || castVoteMutation.isPending}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      {castVoteMutation.isPending ? "Vote en cours..." : "Voter"}
                    </Button>
                  </div>
                ) : vote.userVote ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Votre vote :</strong> {vote.userVote.option}
                      {vote.userVote.votingForCompany && (
                        <span className="text-green-600 ml-2">
                          (pour {vote.userVote.votingForCompany})
                        </span>
                      )}
                    </p>
                  </div>
                ) : null}

                {vote.results && vote.results.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">Résultats :</p>
                    {vote.results.map((result, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">{result.option}</span>
                          <span className="text-sm font-medium">
                            {result.count} ({result.percentage}%)
                          </span>
                        </div>
                        <Progress value={result.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}

                {isEditMode && vote.isOpen && (
                  <div className="pt-3 border-t">
                    <Button
                      onClick={() => closeVoteMutation.mutate(vote.id)}
                      disabled={closeVoteMutation.isPending}
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      {closeVoteMutation.isPending ? "Fermeture..." : "Fermer le vote"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateVoteModal
          agendaItemId={parseInt(sectionId)}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: [`/api/sections/${sectionId}/votes`] });
          }}
        />
      )}
    </div>
  );
}