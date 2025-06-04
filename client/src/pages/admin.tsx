import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Users, Building2, Plus, Trash2 } from "lucide-react";

// Schemas de validation
const createUserSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  role: z.string().min(1, "Le rôle est requis"),
  structure: z.string().optional(),
});

const createStructureSchema = z.object({
  name: z.string().min(1, "Le nom de la structure est requis"),
  type: z.string().min(1, "Le type de structure est requis"),
  description: z.string().optional(),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;
type CreateStructureFormData = z.infer<typeof createStructureSchema>;

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  structure?: string;
  createdAt: string;
}

interface Structure {
  id: number;
  name: string;
  type: string;
  description?: string;
  createdAt: string;
}

export default function AdminPanel() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("users");

  // Queries (always call hooks)
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: false, // Désactivé temporairement pour éviter les erreurs 401
  });

  const { data: structures = [], isLoading: isLoadingStructures } = useQuery({
    queryKey: ["/api/admin/structures"],
    enabled: false, // Désactivé temporairement pour éviter les erreurs 401
  });

  // Forms
  const userForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      role: "",
      structure: "",
    },
  });

  const structureForm = useForm<CreateStructureFormData>({
    resolver: zodResolver(createStructureSchema),
    defaultValues: {
      name: "",
      type: "",
      description: "",
    },
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error("Erreur lors de la création de l'utilisateur");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Utilisateur créé",
        description: "Le nouvel utilisateur a été créé avec succès.",
      });
      userForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer l'utilisateur.",
        variant: "destructive",
      });
    },
  });

  const createStructureMutation = useMutation({
    mutationFn: async (data: CreateStructureFormData) => {
      const response = await fetch("/api/admin/structures", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error("Erreur lors de la création de la structure");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Structure créée",
        description: "La nouvelle structure a été créée avec succès.",
      });
      structureForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/structures"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la structure.",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleCreateUser = (data: CreateUserFormData) => {
    createUserMutation.mutate(data);
  };

  const handleCreateStructure = (data: CreateStructureFormData) => {
    createStructureMutation.mutate(data);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Administration
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestion des utilisateurs et des structures
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="structures" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Structures
            </TabsTrigger>
          </TabsList>

          {/* Onglet Utilisateurs */}
          <TabsContent value="users" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Formulaire de création d'utilisateur */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Créer un utilisateur
                  </CardTitle>
                  <CardDescription>
                    Ajouter un nouvel utilisateur au système
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...userForm}>
                    <form onSubmit={userForm.handleSubmit(handleCreateUser)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={userForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Prénom</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={userForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nom</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={userForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={userForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mot de passe</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={userForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rôle</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner un rôle" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Salarié·es SCC">Salarié·es SCC</SelectItem>
                                <SelectItem value="Elu·es">Elu·es</SelectItem>
                                <SelectItem value="Invité·es">Invité·es</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={userForm.control}
                        name="structure"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Structure (optionnel)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ex: Conseil National" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={createUserMutation.isPending}
                      >
                        {createUserMutation.isPending ? "Création..." : "Créer l'utilisateur"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Liste des utilisateurs */}
              <Card>
                <CardHeader>
                  <CardTitle>Utilisateurs existants</CardTitle>
                  <CardDescription>
                    Liste de tous les utilisateurs du système
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingUsers ? (
                    <div className="text-center py-4">Chargement...</div>
                  ) : (users as User[]).length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      Aucun utilisateur trouvé
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(users as User[]).map((userItem: User) => (
                        <div
                          key={userItem.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <div className="font-medium">
                              {userItem.firstName} {userItem.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {userItem.email} • {userItem.role}
                              {userItem.structure && ` • ${userItem.structure}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Onglet Structures */}
          <TabsContent value="structures" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Formulaire de création de structure */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Créer une structure
                  </CardTitle>
                  <CardDescription>
                    Ajouter une nouvelle structure organisationnelle
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...structureForm}>
                    <form onSubmit={structureForm.handleSubmit(handleCreateStructure)} className="space-y-4">
                      <FormField
                        control={structureForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom de la structure</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ex: Conseil National" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={structureForm.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner un type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Conseil">Conseil</SelectItem>
                                <SelectItem value="Commission">Commission</SelectItem>
                                <SelectItem value="Comité">Comité</SelectItem>
                                <SelectItem value="Délégation">Délégation</SelectItem>
                                <SelectItem value="Autre">Autre</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={structureForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (optionnel)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Description de la structure" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={createStructureMutation.isPending}
                      >
                        {createStructureMutation.isPending ? "Création..." : "Créer la structure"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Liste des structures */}
              <Card>
                <CardHeader>
                  <CardTitle>Structures existantes</CardTitle>
                  <CardDescription>
                    Liste de toutes les structures organisationnelles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingStructures ? (
                    <div className="text-center py-4">Chargement...</div>
                  ) : (structures as Structure[]).length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      Aucune structure trouvée
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(structures as Structure[]).map((structure: Structure) => (
                        <div
                          key={structure.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <div className="font-medium">{structure.name}</div>
                            <div className="text-sm text-gray-500">
                              {structure.type}
                              {structure.description && ` • ${structure.description}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}