import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Users, Plus, Edit, Trash2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { User, Structure } from '@shared/schema';

const createUserSchema = z.object({
  email: z.string().email('Email invalide'),
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
  role: z.enum(['Salarié·es SCC', 'Elu·es']),
  structure: z.string().optional(),
  password: z.string().min(6, 'Mot de passe minimum 6 caractères')
});

const createStructureSchema = z.object({
  name: z.string().min(1, 'Nom de structure requis')
});

type CreateUserFormData = z.infer<typeof createUserSchema>;
type CreateStructureFormData = z.infer<typeof createStructureSchema>;

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showCreateStructureModal, setShowCreateStructureModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingStructure, setEditingStructure] = useState<Structure | null>(null);

  // Requêtes pour récupérer les données
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    enabled: user?.permissions?.canManageUsers
  });

  const { data: structures = [], isLoading: structuresLoading } = useQuery<Structure[]>({
    queryKey: ['/api/admin/structures'],
    enabled: user?.permissions?.canManageUsers
  });

  // Mutations pour créer/modifier des utilisateurs
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      return await apiRequest('/api/admin/users', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setShowCreateUserModal(false);
      toast({ title: 'Utilisateur créé avec succès' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erreur', 
        description: 'Impossible de créer l\'utilisateur', 
        variant: 'destructive' 
      });
    }
  });

  // Mutations pour créer/modifier des structures
  const createStructureMutation = useMutation({
    mutationFn: async (data: CreateStructureFormData) => {
      return await apiRequest('/api/admin/structures', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/structures'] });
      setShowCreateStructureModal(false);
      toast({ title: 'Structure créée avec succès' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erreur', 
        description: 'Impossible de créer la structure', 
        variant: 'destructive' 
      });
    }
  });

  // Formulaires
  const userForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      role: 'Elu·es',
      structure: '',
      password: ''
    }
  });

  const structureForm = useForm<CreateStructureFormData>({
    resolver: zodResolver(createStructureSchema),
    defaultValues: {
      name: ''
    }
  });

  const handleCreateUser = (data: CreateUserFormData) => {
    createUserMutation.mutate(data);
  };

  const handleCreateStructure = (data: CreateStructureFormData) => {
    createStructureMutation.mutate(data);
  };

  if (!user?.permissions?.canManageUsers) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Accès refusé</h2>
            <p className="text-gray-600">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
            <Button onClick={() => setLocation('/')} className="mt-4">
              Retour au tableau de bord
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
          </div>
        </div>

        {/* Onglets principaux */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="structures" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Structures
            </TabsTrigger>
          </TabsList>

          {/* Onglet Utilisateurs */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Gestion des utilisateurs</h2>
              <Button 
                onClick={() => setShowCreateUserModal(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nouvel utilisateur
              </Button>
            </div>

            {usersLoading ? (
              <div className="text-center py-8">Chargement des utilisateurs...</div>
            ) : (
              <div className="grid gap-4">
                {users.map((userItem: User) => (
                  <Card key={userItem.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">
                              {userItem.firstName} {userItem.lastName}
                            </h3>
                            <Badge variant={userItem.role === 'Salarié·es SCC' ? 'default' : 'secondary'}>
                              {userItem.role}
                            </Badge>
                          </div>
                          <p className="text-gray-600">{userItem.email}</p>
                          {userItem.structure && (
                            <p className="text-sm text-gray-500">
                              Structure: {userItem.structure}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {Object.entries(userItem.permissions)
                              .filter(([, value]) => value)
                              .map(([key]) => (
                                <Badge key={key} variant="outline" className="text-xs">
                                  {key.replace('can', '').replace(/([A-Z])/g, ' $1').toLowerCase()}
                                </Badge>
                              ))
                            }
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingUser(userItem)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Onglet Structures */}
          <TabsContent value="structures" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Gestion des structures</h2>
              <Button 
                onClick={() => setShowCreateStructureModal(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nouvelle structure
              </Button>
            </div>

            {structuresLoading ? (
              <div className="text-center py-8">Chargement des structures...</div>
            ) : (
              <div className="grid gap-4">
                {structures.map((structure: Structure) => (
                  <Card key={structure.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <h3 className="font-semibold text-lg">{structure.name}</h3>
                          <p className="text-gray-600">
                            {structure.userCount} utilisateur{structure.userCount > 1 ? 's' : ''}
                          </p>
                          <p className="text-sm text-gray-500">
                            Créée le {new Date(structure.createdAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingStructure(structure)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Modal de création d'utilisateur */}
        <Dialog open={showCreateUserModal} onOpenChange={setShowCreateUserModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
            </DialogHeader>
            <Form {...userForm}>
              <form onSubmit={userForm.handleSubmit(handleCreateUser)} className="space-y-4">
                <FormField
                  control={userForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                      <FormLabel>Structure (pour les élus)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une structure" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Aucune structure</SelectItem>
                          {structures.map((structure: Structure) => (
                            <SelectItem key={structure.id} value={structure.name}>
                              {structure.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        <Input {...field} type="password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateUserModal(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={createUserMutation.isPending}>
                    {createUserMutation.isPending ? 'Création...' : 'Créer'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Modal de création de structure */}
        <Dialog open={showCreateStructureModal} onOpenChange={setShowCreateStructureModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Créer une nouvelle structure</DialogTitle>
            </DialogHeader>
            <Form {...structureForm}>
              <form onSubmit={structureForm.handleSubmit(handleCreateStructure)} className="space-y-4">
                <FormField
                  control={structureForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de la structure</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Conseil Municipal de Paris" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateStructureModal(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={createStructureMutation.isPending}>
                    {createStructureMutation.isPending ? 'Création...' : 'Créer'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}