import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Form schemas
const createUserSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  role: z.string().min(1, "Le rôle est requis"),
  structure: z.string().optional(),
});

const createStructureSchema = z.object({
  name: z.string().min(1, "Le nom de l'entreprise est requis"),
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

  // Create a simple test function for enterprises
  const testCreateEnterprise = async (name: string) => {
    try {
      const response = await fetch("/api/admin/structures", {
        method: "POST",
        body: JSON.stringify({ name }),
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      toast({
        title: "Succès",
        description: "Entreprise créée avec succès",
      });
      return result;
    } catch (error) {
      console.error("Erreur création entreprise:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la création",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Form configuration
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
    },
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      return await apiRequest("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      toast({
        title: "Utilisateur créé",
        description: "Le nouvel utilisateur a été créé avec succès.",
      });
      userForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Erreur lors de la création de l'utilisateur.",
        variant: "destructive",
      });
    },
  });

  const createStructureMutation = useMutation({
    mutationFn: async (data: CreateStructureFormData) => {
      return await testCreateEnterprise(data.name);
    },
    onSuccess: () => {
      toast({
        title: "Entreprise créée",
        description: "La nouvelle entreprise a été créée avec succès.",
      });
      structureForm.reset();
    },
    onError: (error) => {
      console.error("Erreur mutation:", error);
    },
  });

  // Event handlers
  const handleCreateUser = (data: CreateUserFormData) => {
    createUserMutation.mutate(data);
  };

  const handleCreateStructure = (data: CreateStructureFormData) => {
    createStructureMutation.mutate(data);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Accès non autorisé</h2>
          <p>Vous devez être connecté pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administration</h1>
          <p className="text-muted-foreground">
            Gestion des utilisateurs et des entreprises
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="structures">Entreprises</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ajouter un Utilisateur</CardTitle>
              <CardDescription>
                Créer un nouveau compte utilisateur
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
                            <Input placeholder="Prénom" {...field} />
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
                            <Input placeholder="Nom" {...field} />
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
                          <Input type="email" placeholder="email@exemple.com" {...field} />
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
                          <Input type="password" placeholder="Mot de passe" {...field} />
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
                            <SelectItem value="salaried">Salarié·es</SelectItem>
                            <SelectItem value="elected">Elu·es</SelectItem>
                            <SelectItem value="external">Externe</SelectItem>
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
                        <FormLabel>Entreprise (optionnel)</FormLabel>
                        <FormControl>
                          <Input placeholder="Nom de l'entreprise" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" disabled={createUserMutation.isPending}>
                    {createUserMutation.isPending ? "Création..." : "Créer l'utilisateur"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Utilisateurs</CardTitle>
              <CardDescription>
                Liste de tous les utilisateurs du système
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <p>Chargement des utilisateurs temporairement désactivé</p>
                <p className="text-sm mt-2">En cours de résolution des problèmes de session</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="structures" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ajouter une Entreprise</CardTitle>
              <CardDescription>
                Créer une nouvelle entreprise
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
                        <FormLabel>Nom de l'entreprise</FormLabel>
                        <FormControl>
                          <Input placeholder="Nom de l'entreprise" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" disabled={createStructureMutation.isPending}>
                    {createStructureMutation.isPending ? "Création..." : "Créer l'entreprise"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Entreprises</CardTitle>
              <CardDescription>
                Liste de toutes les entreprises
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <p>Aucune entreprise créée pour le moment</p>
                <p className="text-sm mt-2">Utilisez le formulaire ci-dessus pour ajouter des entreprises</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}