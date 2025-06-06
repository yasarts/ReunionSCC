import { Vote } from "lucide-react";

interface VoteCardProps {
  agendaItemId: number;
}

export function VoteCard({ agendaItemId }: VoteCardProps) {
  return (
    <div className="bg-white border border-purple-200 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
          <Vote className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h4 className="font-medium text-gray-900">Système de vote disponible</h4>
          <p className="text-sm text-gray-600">Créez des votes pour cette section</p>
        </div>
      </div>
      
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
        <h5 className="font-medium text-purple-900 mb-2">Fonctionnalités de vote :</h5>
        <ul className="text-sm text-purple-800 space-y-1">
          <li>• Votes avec choix multiples personnalisables</li>
          <li>• Gestion des procurations entre entreprises</li>
          <li>• Délégation de vote pour les salariés</li>
          <li>• Résultats en temps réel avec pourcentages</li>
          <li>• Respect des règles de quorum français</li>
        </ul>
      </div>
      
      <div className="mt-3 text-xs text-gray-500">
        Section ID: {agendaItemId} - Utilisez le bouton "Créer un vote" ci-dessus
      </div>
    </div>
  );
}