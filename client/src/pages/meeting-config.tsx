import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Calendar, Clock } from "lucide-react";

const meetingConfigSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  date: z.string().min(1, "La date est requise"),
  time: z.string().min(1, "L'heure de début est requise"),
  description: z.string().optional()
});

type MeetingConfigData = z.infer<typeof meetingConfigSchema>;

interface Meeting {
  id: number;
  title: string;
  date: string;
  time: string;
  description?: string;
  status: string;
}

export default function MeetingConfig() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const meetingId = parseInt(id || "0");

  // Récupérer les données de la réunion
  const { data: meeting, isLoading } = useQuery<Meeting>({
    queryKey: ["/api/meetings", meetingId],
    enabled: !!meetingId
  });

  const form = useForm<MeetingConfigData>({
    resolver: zodResolver(meetingConfigSchema),
    defaultValues: {
      title: "",
      date: "",
      time: "",
      description: ""
    }
  });

  // Mettre à jour les valeurs du formulaire quand les données de la réunion sont chargées
  useEffect(() => {
    if (meeting) {
      const meetingDate = new Date(meeting.date);
      const formattedDate = meetingDate.toISOString().split('T')[0];
      const formattedTime = meeting.time || "09:00";

      form.reset({
        title: meeting.title,
        date: formattedDate,
        time: formattedTime,
        description: meeting.description || ""
      });
    }
  }, [meeting, form]);

  // Mutation pour mettre à jour la réunion
  const updateMeetingMutation = useMutation({
    mutationFn: async (data: MeetingConfigData) => {
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: data.title,
          date: `${data.date}T${data.time}:00.000Z`,
          time: data.time,
          description: data.description
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      toast({
        title: "Réunion mise à jour",
        description: "Les modifications ont été enregistrées avec succès."
      });
      setLocation("/");
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la réunion.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: MeetingConfigData) => {
    updateMeetingMutation.mutate(data);
  };

  // Vérifier les permissions
  const canEdit = user?.role === "Salarié·es SCC" || user?.permissions?.canEdit;

  if (!canEdit) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Accès non autorisé</h2>
            <p className="text-muted-foreground mb-4">
              Vous n'avez pas les permissions nécessaires pour modifier cette réunion.
            </p>
            <Button onClick={() => setLocation("/")}>
              Retour au tableau de bord
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Réunion non trouvée</h2>
            <p className="text-muted-foreground mb-4">
              La réunion demandée n'existe pas ou a été supprimée.
            </p>
            <Button onClick={() => setLocation("/")}>
              Retour au tableau de bord
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* En-tête */}
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation("/")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Configuration de la réunion</h1>
          <p className="text-muted-foreground">
            Modifiez les informations essentielles de votre réunion
          </p>
        </div>
      </div>

      {/* Formulaire de configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Informations de base
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Titre */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titre de la réunion</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Conseil National - Janvier 2025"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date et heure */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de la réunion</FormLabel>
                      <FormControl>
                        <Input 
                          type="date"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Heure de début
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="time"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description/Résumé */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Résumé de la réunion (optionnel)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Décrivez brièvement l'objet et les points principaux de cette réunion..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Boutons d'action */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/")}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={updateMeetingMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {updateMeetingMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {updateMeetingMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Informations supplémentaires */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">
              <strong>Note :</strong> Cette interface simplifiée permet de modifier uniquement les informations essentielles de la réunion.
            </p>
            <p>
              Pour gérer l'ordre du jour, les participants ou d'autres paramètres avancés, 
              utilisez les fonctionnalités spécialisées depuis le tableau de bord principal.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}