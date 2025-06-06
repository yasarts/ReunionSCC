import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Vote, Building2, Users, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface VotableCompany {
  id: number;
  name: string;
  type: 'present' | 'proxy';
  representativeId: number;
  representativeName: string;
}

interface CompanyVote {
  companyId: number;
  companyName: string;
  votes: {
    option: string;
    voterName: string;
    voterId: number;
    isProxy: boolean;
  }[];
}

interface EnhancedVote {
  id: number;
  question: string;
  options: string[];
  isOpen: boolean;
  results: {
    option: string;
    count: number;
    percentage: number;
  }[];
  totalVotes: number;
  companiesVotes: CompanyVote[];
  userVotes: any[];
}

interface EnhancedVoteData {
  votes: EnhancedVote[];
  votableCompanies: VotableCompany[];
  userRole: string;
  canVoteForCompanies: boolean;
}

interface EnhancedVoteSectionProps {
  sectionId: string;
}

export function EnhancedVoteSection({ sectionId }: EnhancedVoteSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  // Récupérer les données de vote améliorées
  const { data: voteData, isLoading } = useQuery<EnhancedVoteData>({
    queryKey: [`/api/sections/${sectionId}/votes/enhanced`],
  });

  // Mutation pour voter
  const castVoteMutation = useMutation({
    mutationFn: async ({ voteId, option, votingForCompanyId }: { 
      voteId: number; 
      option: string;
      votingForCompanyId?: number;
    }) => {
      return await apiRequest("POST", `/api/votes/${voteId}/cast`, { 
        option,
        votingForCompanyId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${sectionId}/votes/enhanced`] });
      setSelectedOptions({});
      toast({
        title: "Vote enregistré",
        description: "Le vote a été pris en compte",
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

  // Mutation pour supprimer un vote
  const deleteVoteMutation = useMutation({
    mutationFn: async (voteId: number) => {
      return await apiRequest("DELETE", `/api/votes/${voteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${sectionId}/votes/enhanced`] });
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

  // Mutation pour fermer un vote
  const closeVoteMutation = useMutation({
    mutationFn: async (voteId: number) => {
      return await apiRequest("POST", `/api/votes/${voteId}/close`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${sectionId}/votes/enhanced`] });
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
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 animate-spin" />
            <span>Chargement des votes...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!voteData?.votes.length) {
    return null;
  }

  const handleVote = (voteId: number, option: string, companyId?: number) => {
    castVoteMutation.mutate({
      voteId,
      option,
      votingForCompanyId: companyId
    });
  };

  const getCompanyVoteStatus = (vote: EnhancedVote, companyId: number) => {
    return vote.companiesVotes.find(cv => cv.companyId === companyId);
  };

  return (
    <div className="space-y-4">
      {voteData.votes.map((vote) => (
        <Card key={vote.id} className="border-purple-200">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-lg">
                <Vote className="h-5 w-5 mr-2 text-purple-600" />
                {vote.question}
              </CardTitle>
              <div className="flex items-center space-x-2">
                {vote.isOpen ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    <Clock className="h-3 w-3 mr-1" />
                    Ouvert
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-50 text-gray-700">
                    Fermé
                  </Badge>
                )}
                {user && (user.role === 'salaried' || user.role === 'admin') && (
                  <div className="flex space-x-1">
                    {vote.isOpen && (
                      <Button
                        onClick={() => closeVoteMutation.mutate(vote.id)}
                        disabled={closeVoteMutation.isPending}
                        variant="outline"
                        size="sm"
                        className="text-orange-600 hover:text-orange-700"
                      >
                        Fermer
                      </Button>
                    )}
                    <Button
                      onClick={() => deleteVoteMutation.mutate(vote.id)}
                      disabled={deleteVoteMutation.isPending}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Résultats globaux */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Résultats globaux ({vote.totalVotes} votes)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {vote.results.map((result) => (
                  <div key={result.option} className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {result.count}
                    </div>
                    <div className="text-sm text-gray-600">{result.option}</div>
                    <div className="text-xs text-gray-500">({result.percentage}%)</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interface de vote pour salariés */}
            {(voteData.canVoteForCompanies || voteData.userRole === 'Salarié·es SCC') && vote.isOpen && (
              <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                <h4 className="font-medium text-purple-900 mb-4 flex items-center">
                  <Building2 className="h-4 w-4 mr-2" />
                  Vote par entreprise (Rôle salarié)
                </h4>
                
                <div className="space-y-4">
                  {voteData.votableCompanies.map((company) => {
                    const companyVote = getCompanyVoteStatus(vote, company.id);
                    const isVoted = !!companyVote;
                    const selectionKey = `${vote.id}-${company.id}`;
                    
                    return (
                      <div key={company.id} className="border rounded-lg p-3 bg-white">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="font-medium text-gray-900">
                              {company.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              Représenté par {company.representativeName}
                              {company.type === 'proxy' && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Mandat
                                </Badge>
                              )}
                            </div>
                          </div>
                          {isVoted && (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Voté: {companyVote.votes[0]?.option}
                            </Badge>
                          )}
                        </div>

                        {!isVoted && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              {vote.options.map((option) => (
                                <Button
                                  key={option}
                                  variant={selectedOptions[selectionKey] === option ? "default" : "outline"}
                                  className="justify-start text-left h-auto p-2"
                                  onClick={() => setSelectedOptions(prev => ({
                                    ...prev,
                                    [selectionKey]: option
                                  }))}
                                >
                                  {option}
                                </Button>
                              ))}
                            </div>
                            <Button
                              onClick={() => handleVote(vote.id, selectedOptions[selectionKey], company.id)}
                              disabled={!selectedOptions[selectionKey] || castVoteMutation.isPending}
                              className="w-full bg-purple-600 hover:bg-purple-700"
                              size="sm"
                            >
                              {castVoteMutation.isPending ? "Vote en cours..." : `Voter pour ${company.name}`}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Interface de vote standard pour les autres rôles */}
            {!voteData.canVoteForCompanies && vote.isOpen && (
              <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                <h4 className="font-medium text-blue-900 mb-3">Votre vote</h4>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {vote.options.map((option) => (
                      <Button
                        key={option}
                        variant={selectedOptions[`${vote.id}`] === option ? "default" : "outline"}
                        className="justify-start text-left h-auto p-3"
                        onClick={() => setSelectedOptions(prev => ({
                          ...prev,
                          [`${vote.id}`]: option
                        }))}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                  <Button
                    onClick={() => handleVote(vote.id, selectedOptions[`${vote.id}`])}
                    disabled={!selectedOptions[`${vote.id}`] || castVoteMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {castVoteMutation.isPending ? "Vote en cours..." : "Voter"}
                  </Button>
                </div>
              </div>
            )}

            {/* Détail des votes par entreprise */}
            {vote.companiesVotes.length > 0 && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Building2 className="h-4 w-4 mr-2" />
                  Détail des votes par entreprise
                </h4>
                <div className="space-y-2">
                  {vote.companiesVotes.map((companyVote) => (
                    <div key={companyVote.companyId} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="font-medium text-gray-700">
                        {companyVote.companyName}
                      </div>
                      <div className="flex items-center space-x-2">
                        {companyVote.votes.map((v, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {v.option}
                            {v.isProxy && " (mandat)"}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}