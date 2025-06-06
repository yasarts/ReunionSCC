import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Vote, CheckCircle, Clock, Users, Eye } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface VoteOption {
  option: string;
  count: number;
  percentage: number;
  voters: string[];
}

interface VoteData {
  id: number;
  question: string;
  options: string[];
  isOpen: boolean;
  createdBy: number;
  createdAt: string;
  closedAt?: string;
  results?: VoteOption[];
  userVote?: {
    option: string;
    votingForCompany?: string;
  };
  eligibleVoters: {
    userId: number;
    userName: string;
    companyName: string;
    canVoteFor: string[]; // companies they can vote for (including proxies)
  }[];
}

interface VoteCardProps {
  agendaItemId: number;
  meetingId: number;
  vote: VoteData;
  canManageVotes: boolean;
}

export function VoteCard({ agendaItemId, meetingId, vote, canManageVotes }: VoteCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [votingForCompany, setVotingForCompany] = useState<string>("");

  // Get current user's voting eligibility
  const userEligibility = vote.eligibleVoters.find(ev => ev.userId === user?.id);
  const canVote = vote.isOpen && userEligibility && !vote.userVote;

  const castVoteMutation = useMutation({
    mutationFn: async ({ option, companyId }: { option: string; companyId?: number }) => {
      const response = await fetch(`/api/votes/${vote.id}/cast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          option, 
          votingForCompanyId: companyId,
          userId: user?.id 
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erreur lors du vote");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agenda", agendaItemId, "votes"] });
      setSelectedOption("");
      setVotingForCompany("");
    }
  });

  const closeVoteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/votes/${vote.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erreur lors de la fermeture du vote");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agenda", agendaItemId, "votes"] });
    }
  });

  const handleVote = () => {
    if (!selectedOption) return;
    
    const companyId = votingForCompany ? parseInt(votingForCompany) : undefined;
    castVoteMutation.mutate({ option: selectedOption, companyId });
  };

  const handleCloseVote = () => {
    if (window.confirm("Êtes-vous sûr de vouloir fermer ce vote ? Cette action est irréversible.")) {
      closeVoteMutation.mutate();
    }
  };

  const totalVotes = vote.results?.reduce((sum, result) => sum + result.count, 0) || 0;

  return (
    <Card className="border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
              <Vote className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Vote
              </CardTitle>
              <CardDescription className="text-sm text-gray-600 dark:text-gray-300">
                {vote.question}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {vote.isOpen ? (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400">
                <Clock className="w-3 h-3 mr-1" />
                En cours
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-400">
                <CheckCircle className="w-3 h-3 mr-1" />
                Terminé
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {vote.isOpen && canVote && (
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-amber-200 dark:border-amber-800">
            <h4 className="font-medium mb-3 text-gray-900 dark:text-white">Votre vote</h4>
            
            {userEligibility && userEligibility.canVoteFor.length > 1 && (
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Voter au nom de :
                </label>
                <select
                  value={votingForCompany}
                  onChange={(e) => setVotingForCompany(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Sélectionner une entreprise</option>
                  {userEligibility.canVoteFor.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2 mb-3">
              {vote.options.map((option) => (
                <label key={option} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`vote-${vote.id}`}
                    value={option}
                    checked={selectedOption === option}
                    onChange={(e) => setSelectedOption(e.target.value)}
                    className="w-4 h-4 text-amber-600"
                  />
                  <span className="text-gray-900 dark:text-white">{option}</span>
                </label>
              ))}
            </div>

            <Button 
              onClick={handleVote}
              disabled={!selectedOption || castVoteMutation.isPending || (userEligibility?.canVoteFor.length > 1 && !votingForCompany)}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            >
              {castVoteMutation.isPending ? "Vote en cours..." : "Voter"}
            </Button>
          </div>
        )}

        {vote.userVote && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Vous avez voté : <strong>{vote.userVote.option}</strong>
              {vote.userVote.votingForCompany && (
                <span> (au nom de {vote.userVote.votingForCompany})</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {vote.results && vote.results.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 dark:text-white">Résultats</h4>
              <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                <Users className="w-4 h-4" />
                {totalVotes} vote{totalVotes > 1 ? 's' : ''}
              </div>
            </div>
            
            {vote.results.map((result) => (
              <div key={result.option} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {result.option}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {result.count} ({result.percentage.toFixed(1)}%)
                  </span>
                </div>
                <Progress value={result.percentage} className="h-2" />
                {result.voters.length > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <Eye className="w-3 h-3 inline mr-1" />
                    {result.voters.join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {vote.isOpen && canManageVotes && (
          <div className="pt-3 border-t border-amber-200 dark:border-amber-800">
            <Button 
              onClick={handleCloseVote}
              variant="outline"
              disabled={closeVoteMutation.isPending}
              className="w-full border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/20"
            >
              {closeVoteMutation.isPending ? "Fermeture..." : "Fermer le vote"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}