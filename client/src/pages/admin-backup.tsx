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
import { insertCompanySchema, insertUserSchema, insertMeetingTypeSchema, type Company, type User, type MeetingType, type MeetingTypeAccess } from '@shared/schema';
import { z } from 'zod';

const createCompanyFormSchema = insertCompanySchema;
const createUserFormSchema = insertUserSchema.extend({
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

const createMeetingTypeFormSchema = insertMeetingTypeSchema;

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showCreateCompanyModal, setShowCreateCompanyModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showCreateMeetingTypeModal, setShowCreateMeetingTypeModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingMeetingType, setEditingMeetingType] = useState<MeetingType | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedMeetingType, setSelectedMeetingType] = useState<MeetingType | null>(null);

  // Requêtes pour récupérer les données
  const { data: companies, isLoading: companiesLoading } = useQuery({
    queryKey: ['/api/companies'],
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
  });

  const { data: meetingTypes, isLoading: meetingTypesLoading } = useQuery({
    queryKey: ['/api/meeting-types'],
  });

  const { data: meetingTypeAccess, isLoading: accessLoading } = useQuery({
    queryKey: ['/api/meeting-types', selectedMeetingType?.id, 'access'],
    enabled: !!selectedMeetingType?.id,
  });

  // Mutations pour créer/modifier/supprimer des entreprises
  const createCompanyMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createCompanyFormSchema>) => {
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
    onError: () => {
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

  // Mutations pour créer/modifier/supprimer des types de réunions
  const createMeetingTypeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createMeetingTypeFormSchema>) => {
      return await apiRequest('POST', '/api/meeting-types', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meeting-types'] });
      setShowCreateMeetingTypeModal(false);
      toast({
        title: "Succès",
        description: "Type de réunion créé avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de créer le type de réunion",
        variant: "destructive",
      });
    },
  });

  const updateMeetingTypeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<MeetingType> }) => {
      return await apiRequest('PUT', `/api/meeting-types/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meeting-types'] });
      setEditingMeetingType(null);
      toast({
        title: "Succès",
        description: "Type de réunion modifié avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le type de réunion",
        variant: "destructive",
      });
    },
  });

  const deleteMeetingTypeMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/meeting-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meeting-types'] });
      toast({
        title: "Succès",
        description: "Type de réunion supprimé avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le type de réunion",
        variant: "destructive",
      });
    },
  });

  const addMeetingTypeAccessMutation = useMutation({
    mutationFn: async ({ meetingTypeId, data }: { meetingTypeId: number; data: any }) => {
      return await apiRequest('POST', `/api/meeting-types/${meetingTypeId}/access`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meeting-types', selectedMeetingType?.id, 'access'] });
      toast({
        title: "Succès",
        description: "Accès ajouté avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'accès",
        variant: "destructive",
      });
    },
  });

  const removeMeetingTypeAccessMutation = useMutation({
    mutationFn: async (accessId: number) => {
      return await apiRequest('DELETE', `/api/meeting-type-access/${accessId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meeting-types', selectedMeetingType?.id, 'access'] });
      toast({
        title: "Succès",
        description: "Accès supprimé avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'accès",
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

  const meetingTypeForm = useForm<z.infer<typeof createMeetingTypeFormSchema>>({
    resolver: zodResolver(createMeetingTypeFormSchema),
    defaultValues: {
      name: '',
      description: '',
      color: '#0ea5e9',
    },
  });

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
                Retourner au dashboard
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
            <TabsTrigger value="meeting-types" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Types de Réunions
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
              <div className="text-center py-8">Chargement...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {companies?.map((company: Company) => (
                  <Card key={company.id} className="bg-white hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{company.name}</CardTitle>
                        <div className="flex gap-1">
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
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-gray-400" />
                          <span>{company.sector || 'Secteur non spécifié'}</span>
                        </div>
                        {company.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{company.phone}</span>
                          </div>
                        )}
                        {company.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span>{company.email}</span>
                          </div>
                        )}
                        {company.description && (
                          <p className="text-gray-600 mt-2">{company.description}</p>
                        )}
                      </div>
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
              <div className="text-center py-8">Chargement...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users?.map((userData: User) => (
                  <Card key={userData.id} className="bg-white hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {userData.firstName} {userData.lastName}
                          </CardTitle>
                          <div className="flex gap-1">
                            <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                              {userData.role || 'Aucun rôle'}
                            </Badge>
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
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span>{userData.email}</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          Entreprise: {companies?.find((c: Company) => c.id === userData.companyId)?.name || 'Non assigné'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Onglet Types de Réunions */}
          <TabsContent value="meeting-types" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-800">Gestion des types de réunions</h2>
              <Button 
                onClick={() => setShowCreateMeetingTypeModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouveau type
              </Button>
            </div>

            {meetingTypesLoading ? (
              <div className="text-center py-8">Chargement...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {meetingTypes?.map((meetingType: MeetingType) => (
                  <Card key={meetingType.id} className="bg-white hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: meetingType.color }}
                          />
                          <CardTitle className="text-lg">{meetingType.name}</CardTitle>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingMeetingType(meetingType)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMeetingTypeMutation.mutate(meetingType.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-3">
                        {meetingType.description || "Aucune description"}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedMeetingType(meetingType)}
                        >
                          Gérer les accès
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Modal création type de réunion */}
        <Dialog open={showCreateMeetingTypeModal} onOpenChange={setShowCreateMeetingTypeModal}>
          <DialogContent className="bg-white max-w-md">
            <DialogHeader>
              <DialogTitle>Créer un nouveau type de réunion</DialogTitle>
            </DialogHeader>
            <Form {...meetingTypeForm}>
              <form onSubmit={meetingTypeForm.handleSubmit((data) => createMeetingTypeMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={meetingTypeForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du type *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Conseil National" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={meetingTypeForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Description du type de réunion" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={meetingTypeForm.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Couleur</FormLabel>
                      <FormControl>
                        <Input {...field} type="color" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateMeetingTypeModal(false)}
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMeetingTypeMutation.isPending}
                  >
                    {createMeetingTypeMutation.isPending ? 'Création...' : 'Créer'}
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