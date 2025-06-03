import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X } from "lucide-react";

const createMeetingSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().optional(),
  date: z.string().min(1, "La date est requise"),
});

type CreateMeetingFormData = z.infer<typeof createMeetingSchema>;

interface CreateMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateMeetingModal({ isOpen, onClose }: CreateMeetingModalProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CreateMeetingFormData>({
    resolver: zodResolver(createMeetingSchema),
  });

  const createMeetingMutation = useMutation({
    mutationFn: async (data: CreateMeetingFormData) => {
      const response = await apiRequest("POST", "/api/meetings", {
        ...data,
        date: new Date(data.date).toISOString(),
        status: "draft"
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      reset();
      onClose();
      setError("");
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Erreur lors de la création");
    },
  });

  const onSubmit = (data: CreateMeetingFormData) => {
    setError("");
    createMeetingMutation.mutate(data);
  };

  const handleClose = () => {
    if (!createMeetingMutation.isPending) {
      reset();
      setError("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-gray-800">
              Créer une nouvelle réunion
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClose}
              disabled={createMeetingMutation.isPending}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            Configurez les détails de votre nouvelle réunion.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label htmlFor="title">Titre de la réunion *</Label>
              <Input
                id="title"
                {...register("title")}
                placeholder="Ex: Conseil National - 12/06/2025"
                disabled={createMeetingMutation.isPending}
              />
              {errors.title && (
                <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="date">Date et heure *</Label>
              <Input
                id="date"
                type="datetime-local"
                {...register("date")}
                disabled={createMeetingMutation.isPending}
              />
              {errors.date && (
                <p className="text-sm text-red-600 mt-1">{errors.date.message}</p>
              )}
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">Description (optionnelle)</Label>
            <Textarea
              id="description"
              {...register("description")}
              rows={3}
              placeholder="Contexte et objectifs de la réunion..."
              disabled={createMeetingMutation.isPending}
            />
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createMeetingMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={createMeetingMutation.isPending}
            >
              {createMeetingMutation.isPending ? "Création..." : "Créer la réunion"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
