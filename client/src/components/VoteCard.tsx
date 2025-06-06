import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Vote, Clock, CheckCircle, Users, Eye, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface VoteCardProps {
  agendaItemId: number;
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

export function VoteCard({ agendaItemId }: VoteCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedOption, setSelectedOption] = useState<string>("");

  // Récupérer les votes pour cet élément d'agenda
  const { data: votes = [], isLoading, error } = useQuery({
    queryKey: ["/api/agenda", agendaItemId, "votes"],
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
      queryClient.invalidateQueries({ queryKey: ["/api/agenda", agendaItemId, "votes"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/agenda", agendaItemId, "votes"] });
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
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erreur lors du chargement des votes
        </AlertDescription>
      </Alert>
    );
  }

  if (votes.length === 0) {
    return (
      <div className="text-center py-8">
        <Vote className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Aucun vote créé pour cette section</p>
        <p className="text-xs text-gray-400 mt-1">Utilisez le bouton "Créer un vote" pour commencer</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {votes.map((vote: VoteData) => (
        <Card key={vote.id} className="border-purple-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Vote className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">{vote.question}</CardTitle>
                  <p className="text-sm text-gray-600">
                    Créé le {new Date(vote.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant={vote.isOpen ? "default" : "secondary"} className="flex items-center gap-1">
                  {vote.isOpen ? (
                    <>
                      <Clock className="h-3 w-3" />
                      En cours
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3 w-3" />
                      Fermé
                    </>
                  )}
                </Badge>
                
                {vote.totalVotes !== undefined && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {vote.totalVotes} vote(s)
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Interface de vote pour les votes ouverts */}
            {vote.isOpen && !vote.userVote && user && (
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-medium text-gray-900 mb-3">Votre vote</h4>
                
                <div className="space-y-2 mb-4">
                  {vote.options.map(option => (
                    <label key={option} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`vote-${vote.id}`}
                        value={option}
                        checked={selectedOption === option}
                        onChange={(e) => setSelectedOption(e.target.value)}
                        className="text-purple-600"
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
                
                <Button 
                  onClick={() => {
                    if (selectedOption) {
                      castVoteMutation.mutate({ voteId: vote.id, option: selectedOption });
                    }
                  }}
                  disabled={!selectedOption || castVoteMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {castVoteMutation.isPending ? "Vote en cours..." : "Voter"}
                </Button>
              </div>
            )}

            {/* Vote existant de l'utilisateur */}
            {vote.userVote && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Vous avez voté : <strong>{vote.userVote.option}</strong>
                  {vote.userVote.votingForCompany && (
                    <span> (pour {vote.userVote.votingForCompany})</span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Résultats */}
            {vote.results && vote.results.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Résultats</h4>
                  <span className="text-sm text-gray-600">
                    {vote.totalVotes || 0} vote(s) total
                  </span>
                </div>
                
                {vote.results.map(result => (
                  <div key={result.option} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">{result.option}</span>
                      <span className="text-sm text-gray-600">
                        {result.count} vote(s) ({result.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress value={result.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            )}

            {/* Contrôles admin */}
            {vote.isOpen && user && (
              <div className="pt-3 border-t border-gray-200">
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
  );
}