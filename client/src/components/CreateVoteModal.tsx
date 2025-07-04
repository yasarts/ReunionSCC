import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Trash2, Vote } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const createVoteSchema = z.object({
  question: z.string().min(1, "La question est requise"),
  options: z.array(z.string().min(1, "L'option ne peut pas être vide")).min(2, "Au moins 2 options sont requises")
});

type CreateVoteFormData = z.infer<typeof createVoteSchema>;

interface CreateVoteModalProps {
  isOpen?: boolean;
  onClose: () => void;
  agendaItemId: number;
  sectionId?: string; // Ajouter l'ID de section pour l'invalidation du cache
  onSuccess?: () => void;
}

export function CreateVoteModal({ isOpen, onClose, agendaItemId, sectionId, onSuccess }: CreateVoteModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [options, setOptions] = useState<string[]>(["Pour", "Contre", "Abstention"]);

  const form = useForm<CreateVoteFormData>({
    resolver: zodResolver(createVoteSchema),
    defaultValues: {
      question: "",
      options: ["Pour", "Contre", "Abstention"]
    }
  });

  const createVoteMutation = useMutation({
    mutationFn: async (data: CreateVoteFormData) => {
      return await apiRequest("POST", `/api/agenda/${agendaItemId}/votes`, data);
    },
    onSuccess: () => {
      // Invalider tous les caches liés aux votes pour assurer l'affichage immédiat
      if (sectionId) {
        queryClient.invalidateQueries({ queryKey: [`/api/sections/${sectionId}/votes`] });
        queryClient.invalidateQueries({ queryKey: [`/api/sections/${sectionId}/votes/enhanced`] });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/agenda/${agendaItemId}/votes`] });
      queryClient.invalidateQueries({ queryKey: ['/api/votes'] });
      
      toast({
        title: "Succès",
        description: "Vote créé avec succès",
      });
      onClose();
      form.reset();
      setOptions(["Pour", "Contre", "Abstention"]);
      
      // Call the optional onSuccess callback
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la création du vote",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: CreateVoteFormData) => {
    createVoteMutation.mutate({ ...data, options });
  };

  const addOption = () => {
    setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Vote className="w-5 h-5 text-amber-600" />
            Créer un nouveau vote
          </DialogTitle>
          <DialogDescription>
            Ajoutez un vote à cette section de l'ordre du jour
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question du vote</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Quelle est la question soumise au vote ?"
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel>Options de vote</FormLabel>
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1"
                  />
                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeOption(index)}
                      className="p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                onClick={addOption}
                className="w-full flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Ajouter une option
              </Button>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={createVoteMutation.isPending || options.some(o => o.trim() === "")}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {createVoteMutation.isPending ? "Création..." : "Créer le vote"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}