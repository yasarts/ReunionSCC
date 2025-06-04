import { useState } from 'react';
import React from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Users, Plus, Edit, Trash2, Building, MapPin, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { insertCompanySchema, insertUserSchema, type Company, type User } from '@shared/schema';
import { z } from 'zod';

const createCompanyFormSchema = insertCompanySchema;
const createUserFormSchema = insertUserSchema.extend({
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showCreateCompanyModal, setShowCreateCompanyModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Requêtes pour récupérer les données
  const { data: companies, isLoading: companiesLoading } = useQuery({
    queryKey: ['/api/companies'],
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
  });

  // Mutations pour créer/modifier/supprimer des entreprises
  const createCompanyMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createCompanyFormSchema>) => {
      console.log('Création entreprise:', data);
      return await apiRequest('POST', '/api/companies', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      setShowCreateCompanyModal(false);
      toast({
        title: "Succès",
        description: "Entreprise créée avec succès",
      });
    },
    onError: (error) => {
      console.error('Erreur création entreprise:', error);
      console.error('Erreur mutation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer l'entreprise",
        variant: "destructive",
      });
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Company> }) => {
      return await apiRequest('PUT', `/api/companies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      setEditingCompany(null);
      toast({
        title: "Succès",
        description: "Entreprise modifiée avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'entreprise",
        variant: "destructive",
      });
    },
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/companies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      toast({
        title: "Succès",
        description: "Entreprise supprimée avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'entreprise",
        variant: "destructive",
      });
    },
  });

  // Mutations pour créer/modifier des utilisateurs
  const createUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createUserFormSchema>) => {
      return await apiRequest('POST', '/api/users', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setShowCreateUserModal(false);
      toast({
        title: "Succès",
        description: "Utilisateur créé avec succès",
      });
    },
    onError: (error) => {
      console.error('Erreur création utilisateur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer l'utilisateur",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<User> }) => {
      return await apiRequest('PUT', `/api/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setEditingUser(null);
      toast({
        title: "Succès",
        description: "Utilisateur modifié avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'utilisateur",
        variant: "destructive",
      });
    },
  });

  // Formulaires
  const companyForm = useForm<z.infer<typeof createCompanyFormSchema>>({
    resolver: zodResolver(createCompanyFormSchema),
    defaultValues: {
      name: '',
      siret: '',
      address: '',
      phone: '',
      email: '',
      sector: '',
      description: '',
    },
  });

  const userForm = useForm<z.infer<typeof createUserFormSchema>>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      role: '',
      companyId: null,
      permissions: {
        canView: true,
        canEdit: false,
        canManageAgenda: false,
        canManageParticipants: false,
        canCreateMeetings: false,
        canManageUsers: false,
        canVote: true,
        canSeeVoteResults: true,
      },
    },
  });

  // Formulaires d'édition
  const editCompanyForm = useForm<z.infer<typeof createCompanyFormSchema>>({
    resolver: zodResolver(createCompanyFormSchema),
    defaultValues: {
      name: '',
      siret: '',
      address: '',
      phone: '',
      email: '',
      sector: '',
      description: '',
    },
  });

  const editUserForm = useForm<Partial<User>>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: '',
      companyId: null,
    },
  });

  // Effet pour remplir les formulaires d'édition quand on sélectionne un élément à modifier
  React.useEffect(() => {
    if (editingCompany) {
      editCompanyForm.reset({
        name: editingCompany.name || '',
        siret: editingCompany.siret || '',
        address: editingCompany.address || '',
        phone: editingCompany.phone || '',
        email: editingCompany.email || '',
        sector: editingCompany.sector || '',
        description: editingCompany.description || '',
      });
    }
  }, [editingCompany, editCompanyForm]);

  React.useEffect(() => {
    if (editingUser) {
      editUserForm.reset({
        firstName: editingUser.firstName || '',
        lastName: editingUser.lastName || '',
        email: editingUser.email || '',
        role: editingUser.role || '',
        companyId: editingUser.companyId,
      });
    }
  }, [editingUser, editUserForm]);

  const onCreateCompany = (data: z.infer<typeof createCompanyFormSchema>) => {
    createCompanyMutation.mutate(data);
  };

  const onCreateUser = (data: z.infer<typeof createUserFormSchema>) => {
    createUserMutation.mutate(data);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Salarié·es SCC':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Elu·es':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCompanyName = (companyId: number | null) => {
    if (!companyId || !companies) return 'Non assigné';
    const company = companies.find((c: Company) => c.id === companyId);
    return company?.name || 'Non assigné';
  };

  // Vérification des permissions
  if (!user?.permissions?.canManageUsers) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Accès refusé</h2>
              <p className="text-gray-600">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
              <Button onClick={() => setLocation('/')} className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour au tableau de bord
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => setLocation('/')}
              className="bg-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-3xl font-bold text-gray-800">Administration</h1>
          </div>
        </div>

        {/* Contenu principal avec onglets */}
        <Tabs defaultValue="companies" className="space-y-6">
          <TabsList className="bg-white p-1 rounded-lg shadow-sm">
            <TabsTrigger value="companies" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Entreprises
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Utilisateurs
            </TabsTrigger>
          </TabsList>

          {/* Onglet Entreprises */}
          <TabsContent value="companies" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-800">Gestion des entreprises</h2>
              <Button 
                onClick={() => setShowCreateCompanyModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle entreprise
              </Button>
            </div>

            {companiesLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded mb-4"></div>
                      <div className="h-3 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {companies?.map((company: Company) => (
                  <Card key={company.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg text-gray-800">{company.name}</CardTitle>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingCompany(company)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCompanyMutation.mutate(company.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {company.siret && (
                        <p className="text-sm text-gray-600">SIRET: {company.siret}</p>
                      )}
                      {company.sector && (
                        <p className="text-sm text-gray-600">Secteur: {company.sector}</p>
                      )}
                      {company.address && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="w-3 h-3" />
                          {company.address}
                        </div>
                      )}
                      {company.phone && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Phone className="w-3 h-3" />
                          {company.phone}
                        </div>
                      )}
                      {company.email && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Mail className="w-3 h-3" />
                          {company.email}
                        </div>
                      )}
                      {company.description && (
                        <p className="text-sm text-gray-600 mt-2">{company.description}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Onglet Utilisateurs */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-800">Gestion des utilisateurs</h2>
              <Button 
                onClick={() => setShowCreateUserModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouvel utilisateur
              </Button>
            </div>

            {usersLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {users?.map((userData: User) => (
                  <Card key={userData.id} className="bg-white shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-medium text-gray-800">
                              {userData.firstName} {userData.lastName}
                            </h3>
                            <Badge className={getRoleColor(userData.role)}>
                              {userData.role}
                            </Badge>
                          </div>
                          <p className="text-gray-600">{userData.email}</p>
                          <p className="text-sm text-gray-500">
                            Entreprise: {getCompanyName(userData.companyId)}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {userData.permissions?.canEdit && (
                              <Badge variant="secondary">Modification</Badge>
                            )}
                            {userData.permissions?.canManageAgenda && (
                              <Badge variant="secondary">Gestion agenda</Badge>
                            )}
                            {userData.permissions?.canManageUsers && (
                              <Badge variant="secondary">Gestion utilisateurs</Badge>
                            )}
                            {userData.permissions?.canCreateMeetings && (
                              <Badge variant="secondary">Création réunions</Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingUser(userData)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Modal de création d'entreprise */}
        <Dialog open={showCreateCompanyModal} onOpenChange={setShowCreateCompanyModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nouvelle entreprise</DialogTitle>
            </DialogHeader>
            <Form {...companyForm}>
              <form onSubmit={companyForm.handleSubmit(onCreateCompany)} className="space-y-4">
                <FormField
                  control={companyForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de l'entreprise *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nom de l'entreprise" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={companyForm.control}
                  name="siret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SIRET</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Numéro SIRET" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={companyForm.control}
                  name="sector"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secteur d'activité</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Secteur d'activité" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={companyForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Adresse complète" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={companyForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Téléphone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={companyForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="Email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={companyForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Description de l'entreprise" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateCompanyModal(false)}
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createCompanyMutation.isPending}
                  >
                    {createCompanyMutation.isPending ? 'Création...' : 'Créer'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Modal d'édition d'entreprise */}
        <Dialog open={!!editingCompany} onOpenChange={() => setEditingCompany(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Modifier l'entreprise</DialogTitle>
            </DialogHeader>
            {editingCompany && (
              <Form {...editCompanyForm}>
                <form onSubmit={editCompanyForm.handleSubmit((data) => updateCompanyMutation.mutate({ id: editingCompany.id, data }))} className="space-y-4">
                  <FormField
                    control={editCompanyForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom de l'entreprise *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nom de l'entreprise" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editCompanyForm.control}
                    name="siret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SIRET</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="SIRET" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editCompanyForm.control}
                    name="sector"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secteur d'activité</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Secteur d'activité" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editCompanyForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresse</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Adresse complète" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editCompanyForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Téléphone</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Téléphone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editCompanyForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="Email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={editCompanyForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Description de l'entreprise" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setEditingCompany(null)}
                    >
                      Annuler
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={updateCompanyMutation.isPending}
                    >
                      {updateCompanyMutation.isPending ? 'Modification...' : 'Modifier'}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de création d'utilisateur */}
        <Dialog open={showCreateUserModal} onOpenChange={setShowCreateUserModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nouvel utilisateur</DialogTitle>
            </DialogHeader>
            <Form {...userForm}>
              <form onSubmit={userForm.handleSubmit(onCreateUser)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={userForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prénom *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Prénom" />
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
                        <FormLabel>Nom *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nom" />
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
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="email@example.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={userForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mot de passe *</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" placeholder="Mot de passe" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={userForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmer *</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" placeholder="Confirmer" />
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
                      <FormLabel>Rôle *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un rôle" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="salaried">Salarié·es SCC</SelectItem>
                          <SelectItem value="elected">Elu·es</SelectItem>
                          <SelectItem value="admin">Administrateur</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={userForm.control}
                  name="companyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entreprise</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))} value={field.value?.toString() || "none"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une entreprise" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Aucune entreprise</SelectItem>
                          {companies?.map((company: Company) => (
                            <SelectItem key={company.id} value={company.id.toString()}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                  <Button 
                    type="submit" 
                    disabled={createUserMutation.isPending}
                  >
                    {createUserMutation.isPending ? 'Création...' : 'Créer'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Modal d'édition d'utilisateur */}
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Modifier l'utilisateur</DialogTitle>
            </DialogHeader>
            {editingUser && (
              <Form {...editUserForm}>
                <form onSubmit={editUserForm.handleSubmit((data) => updateUserMutation.mutate({ id: editingUser.id, data }))} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editUserForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prénom *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Prénom" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editUserForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Nom" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={editUserForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="email@example.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editUserForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rôle *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un rôle" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="salaried">Salarié·es SCC</SelectItem>
                            <SelectItem value="elected">Elu·es</SelectItem>
                            <SelectItem value="admin">Administrateur</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editUserForm.control}
                    name="companyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entreprise</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))} value={field.value?.toString() || "none"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une entreprise" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Aucune entreprise</SelectItem>
                            {companies?.map((company: Company) => (
                              <SelectItem key={company.id} value={company.id.toString()}>
                                {company.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setEditingUser(null)}
                    >
                      Annuler
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={updateUserMutation.isPending}
                    >
                      {updateUserMutation.isPending ? 'Modification...' : 'Modifier'}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}