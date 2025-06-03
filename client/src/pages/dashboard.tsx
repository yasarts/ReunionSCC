import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateMeetingModal } from "@/components/CreateMeetingModal";
import type { Meeting } from "@/types";
import { 
  Users, 
  Calendar, 
  CheckCircle, 
  Vote, 
  Clock, 
  Plus, 
  Settings, 
  LogOut,
  Play,
  Edit,
  Trash2,
  Download,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [showCreateMeeting, setShowCreateMeeting] = useState(false);

  const { data: meetings, isLoading } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings"],
  });

  const handleLogout = async () => {
    console.log("Logout button clicked");
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge className="bg-green-100 text-green-800">Prêt</Badge>;
      case "completed":
        return <Badge variant="secondary">Terminé</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-800">En cours</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Brouillon</Badge>;
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Users className="h-8 w-8 text-indigo-600" />
              <h1 className="text-xl font-semibold text-gray-900">
                Conseil National SCC
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-indigo-100 text-indigo-600">
                    {user && getInitials(user.firstName, user.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-gray-500 capitalize">
                    {user?.role === "salaried" ? "Salarié" : "Membre"}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="h-8 w-8 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Réunions ce mois</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {meetings?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Participants actifs</p>
                  <p className="text-2xl font-semibold text-gray-900">15</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Vote className="h-8 w-8 text-amber-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Votes en cours</p>
                  <p className="text-2xl font-semibold text-gray-900">2</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-8 w-8 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Temps moyen</p>
                  <p className="text-2xl font-semibold text-gray-900">2h 15m</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Meeting Actions */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Réunions</h2>
          <div className="flex space-x-3">
            {user?.permissions.canCreateMeetings && (
              <Button 
                onClick={() => {
                  console.log("Nouvelle réunion button clicked");
                  setShowCreateMeeting(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle réunion
              </Button>
            )}
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Administration
            </Button>
          </div>
        </div>

        {/* Meetings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {meetings?.map((meeting) => (
            <Card key={meeting.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {meeting.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      <Calendar className="inline h-4 w-4 mr-1" />
                      {format(new Date(meeting.date), "d MMMM yyyy", { locale: fr })}
                    </p>
                  </div>
                  {getStatusBadge(meeting.status)}
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    <span>{meeting.participants?.length || 0} participants</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span>{meeting.agendaItems?.length || 0} sujets à l'agenda</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>
                      Durée estimée: {
                        meeting.agendaItems?.reduce((total, item) => total + item.duration, 0) || 0
                      } min
                    </span>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {meeting.status === "scheduled" && (
                    <Button 
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                      size="sm"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Démarrer
                    </Button>
                  )}
                  {meeting.status === "completed" && (
                    <Button 
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Rapport
                    </Button>
                  )}
                  {meeting.status === "draft" && (
                    <Button 
                      variant="secondary"
                      className="flex-1"
                      size="sm"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Modifier
                    </Button>
                  )}
                  
                  <Button variant="ghost" size="sm">
                    {meeting.status === "completed" ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <Edit className="h-4 w-4" />
                    )}
                  </Button>
                  
                  {user?.permissions.canCreateMeetings && (
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {meetings?.length === 0 && (
          <Card className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune réunion
            </h3>
            <p className="text-gray-500 mb-4">
              Commencez par créer votre première réunion.
            </p>
            {user?.permissions.canCreateMeetings && (
              <Button onClick={() => setShowCreateMeeting(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer une réunion
              </Button>
            )}
          </Card>
        )}
      </main>

      {/* Create Meeting Modal */}
      <CreateMeetingModal 
        isOpen={showCreateMeeting} 
        onClose={() => setShowCreateMeeting(false)} 
      />
    </div>
  );
}
