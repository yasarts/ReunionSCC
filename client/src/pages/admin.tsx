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

const editMeetingTypeFormSchema = insertMeetingTypeSchema.pick({
  name: true,
  description: true,
  color: true,
});

// Composant pour gérer les permissions avec persistance
function PermissionCheckbox({ 
  id, 
  label, 
  defaultChecked, 
  roleKey, 
  permission 
}: { 
  id: string; 
  label: string; 
  defaultChecked: boolean; 
  roleKey: string | null; 
  permission: string; 
}) {
  const [checked, setChecked] = React.useState(defaultChecked);

  // Charger les permissions sauvegardées au montage du composant
  React.useEffect(() => {
    if (roleKey) {
      const savedPermissions = localStorage.getItem(`permissions_${roleKey}`);
      if (savedPermissions) {
        const permissions = JSON.parse(savedPermissions);
        setChecked(permissions[permission] ?? defaultChecked);
      } else {
        setChecked(defaultChecked);
      }
    }
  }, [roleKey, permission, defaultChecked]);

  return (
    <div className="flex items-center space-x-2">
      <input 
        type="checkbox" 
        id={id} 
        className="rounded" 
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
      />
      <Label htmlFor={id} className="text-sm">{label}</Label>
    </div>
  );
}

// Composant pour afficher les permissions d'un rôle
function RolePermissionsBadges({ roleKey }: { roleKey: string }) {
  const [permissions, setPermissions] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const savedPermissions = localStorage.getItem(`permissions_${roleKey}`);
    if (savedPermissions) {
      setPermissions(JSON.parse(savedPermissions));
    } else {
      // Permissions par défaut
      const defaultPermissions = roleKey === "elu" ? {
        canView: true,
        canEdit: false,
        canVote: true,
        canSeeVoteResults: true,
        canManageAgenda: true,
        canManageParticipants: true,
        canCreateMeetings: true,
        canManageUsers: true,
      } : {
        canView: true,
        canEdit: false,
        canVote: true,
        canSeeVoteResults: true,
        canManageAgenda: false,
        canManageParticipants: false,
        canCreateMeetings: false,
        canManageUsers: false,
      };
      setPermissions(defaultPermissions);
    }
  }, [roleKey]);

  const getActivePermissions = () => {
    const permissionLabels = {
      canView: "Lecture",
      canEdit: "Édition",
      canVote: "Vote",
      canSeeVoteResults: "Résultats",
      canManageAgenda: "Agenda",
      canManageParticipants: "Participants",
      canCreateMeetings: "Créer réunions",
      canManageUsers: "Gérer utilisateurs",
    };

    return Object.entries(permissions)
      .filter(([_, value]) => value)
      .map(([key, _]) => permissionLabels[key as keyof typeof permissionLabels])
      .filter(Boolean);
  };

  const activePermissions = getActivePermissions();

  if (activePermissions.length === 0) {
    return <Badge variant="secondary" className="text-xs">Aucune permission</Badge>;
  }

  if (activePermissions.length > 3) {
    return (
      <>
        {activePermissions.slice(0, 2).map((permission, index) => (
          <Badge key={index} variant="secondary" className="text-xs">{permission}</Badge>
        ))}
        <Badge variant="outline" className="text-xs">+{activePermissions.length - 2} autres</Badge>
      </>
    );
  }

  return (
    <>
      {activePermissions.map((permission, index) => (
        <Badge key={index} variant="secondary" className="text-xs">{permission}</Badge>
      ))}
    </>
  );
}

// Composant pour afficher les rôles d'un type de réunion
function MeetingTypeRoles({ meetingTypeId }: { meetingTypeId: number }) {
  const { data: roles, isLoading } = useQuery({
    queryKey: [`/api/meeting-types/${meetingTypeId}/roles`],
  });

  if (isLoading) {
    return <div className="text-xs text-gray-400">Chargement...</div>;
  }

  if (!roles || roles.length === 0) {
    return <div className="text-xs text-gray-400">Tous les rôles</div>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((role: any) => (
        <span 
          key={role.id} 
          className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
        >
          {role.role}
        </span>
      ))}
    </div>
  );
}

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showCreateCompanyModal, setShowCreateCompanyModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showCreateMeetingTypeModal, setShowCreateMeetingTypeModal] = useState(false);
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingMeetingType, setEditingMeetingType] = useState<MeetingType | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedMeetingType, setSelectedMeetingType] = useState<MeetingType | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);

  // Requêtes pour récupérer les données
  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ['/api/companies'],
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
  });

  const { data: meetingTypes = [], isLoading: meetingTypesLoading } = useQuery({
    queryKey: ['/api/meeting-types'],
  });

  const { data: meetingTypeAccess = [], isLoading: accessLoading } = useQuery({
    queryKey: ['/api/meeting-types', selectedMeetingType?.id, 'access'],
    enabled: !!selectedMeetingType?.id,
  });

  const { data: meetingTypeRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: [`/api/meeting-types/${editingMeetingType?.id}/roles`],
    enabled: !!editingMeetingType?.id,
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

  // Mutations pour gérer les rôles des types de réunions
  const addMeetingTypeRoleMutation = useMutation({
    mutationFn: async ({ meetingTypeId, role }: { meetingTypeId: number; role: string }) => {
      return await apiRequest('POST', `/api/meeting-types/${meetingTypeId}/roles`, { role });
    },
    onSuccess: (_, { meetingTypeId }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/meeting-types/${meetingTypeId}/roles`] });
      setShowCreateRoleModal(false);
      toast({
        title: "Succès",
        description: "Rôle ajouté avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le rôle",
        variant: "destructive",
      });
    },
  });

  const removeMeetingTypeRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      return await apiRequest('DELETE', `/api/meeting-type-roles/${roleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/meeting-types/${editingMeetingType?.id}/roles`] });
      toast({
        title: "Succès",
        description: "Rôle supprimé avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le rôle",
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

  const editUserFormSchema = insertUserSchema.pick({
    email: true,
    firstName: true,
    lastName: true,
    role: true,
    companyId: true,
  });

  const editUserForm = useForm<z.infer<typeof editUserFormSchema>>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      role: '',
      companyId: null,
    },
  });

  const editMeetingTypeForm = useForm<z.infer<typeof editMeetingTypeFormSchema>>({
    resolver: zodResolver(editMeetingTypeFormSchema),
    defaultValues: {
      name: '',
      description: '',
      color: '#0ea5e9',
    },
  });

  // Effets pour remplir les formulaires d'édition
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
        companyId: editingUser.companyId || null,
      });
    }
  }, [editingUser, editUserForm]);

  React.useEffect(() => {
    if (editingMeetingType) {
      editMeetingTypeForm.reset({
        name: editingMeetingType.name || '',
        description: editingMeetingType.description || '',
        color: editingMeetingType.color || '#0ea5e9',
      });
    }
  }, [editingMeetingType, editMeetingTypeForm]);

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
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Rôles & Permissions
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
                  <Card 
                    key={company.id} 
                    className="bg-white hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedCompany(selectedCompany?.id === company.id ? null : company)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{company.name}</CardTitle>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCompany(company);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCompanyMutation.mutate(company.id);
                            }}
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
                      {selectedCompany?.id === company.id && (
                        <div className="mt-4 pt-4 border-t">
                          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Utilisateurs de cette entreprise
                          </h4>
                          {users?.filter((user: User) => user.companyId === company.id).length > 0 ? (
                            <div className="space-y-2">
                              {users?.filter((user: User) => user.companyId === company.id).map((user: User) => (
                                <div key={user.id} className="text-xs bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                                  <div>
                                    <span className="font-medium">{user.firstName} {user.lastName}</span>
                                    <div className="text-gray-500 mt-1">{user.email}</div>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {user.role || 'Aucun rôle'}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500 italic">Aucun utilisateur assigné à cette entreprise</p>
                          )}
                        </div>
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
                      <div className="mb-3">
                        <div className="text-xs font-medium text-gray-500 mb-1">Rôles autorisés :</div>
                        <MeetingTypeRoles meetingTypeId={meetingType.id} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Onglet Rôles & Permissions */}
          <TabsContent value="roles" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-800">Gestion des rôles et permissions</h2>
              <Button 
                onClick={() => setShowCreateRoleModal(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouveau rôle
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Rôles prédéfinis */}
              <Card 
                className="bg-white hover:shadow-md transition-shadow border-l-4 border-l-blue-500 cursor-pointer"
                onClick={() => setSelectedRole(selectedRole === "salarie" ? null : "salarie")}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      Salarié·es SCC
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingRole("salarie");
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">Rôle par défaut pour les salariés de SCC</p>
                  <div className="space-y-1">
                    <RolePermissionsBadges roleKey="salarie" />
                  </div>
                  {selectedRole === "salarie" && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Utilisateurs avec ce rôle
                      </h4>
                      {users?.filter((user: User) => user.role === "Salarié·es SCC").length > 0 ? (
                        <div className="space-y-2">
                          {users?.filter((user: User) => user.role === "Salarié·es SCC").map((user: User) => (
                            <div key={user.id} className="text-xs bg-blue-50 p-3 rounded-lg flex justify-between items-center">
                              <div>
                                <span className="font-medium">{user.firstName} {user.lastName}</span>
                                <div className="text-gray-500 mt-1">{user.email}</div>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {companies?.find((c: Company) => c.id === user.companyId)?.name || 'Aucune entreprise'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic">Aucun utilisateur avec ce rôle</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card 
                className="bg-white hover:shadow-md transition-shadow border-l-4 border-l-green-500 cursor-pointer"
                onClick={() => setSelectedRole(selectedRole === "elu" ? null : "elu")}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      Elu·es
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingRole("elu");
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">Rôle pour les membres élus du conseil</p>
                  <div className="space-y-1">
                    <RolePermissionsBadges roleKey="elu" />
                  </div>
                  {selectedRole === "elu" && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Utilisateurs avec ce rôle
                      </h4>
                      {users?.filter((user: User) => user.role === "Elu·es").length > 0 ? (
                        <div className="space-y-2">
                          {users?.filter((user: User) => user.role === "Elu·es").map((user: User) => (
                            <div key={user.id} className="text-xs bg-green-50 p-3 rounded-lg flex justify-between items-center">
                              <div>
                                <span className="font-medium">{user.firstName} {user.lastName}</span>
                                <div className="text-gray-500 mt-1">{user.email}</div>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {companies?.find((c: Company) => c.id === user.companyId)?.name || 'Aucune entreprise'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic">Aucun utilisateur avec ce rôle</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white hover:shadow-md transition-shadow border-l-4 border-l-purple-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <Plus className="w-4 h-4" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 text-center py-8">
                    Cliquez sur "Nouveau rôle" pour créer un rôle personnalisé avec des permissions spécifiques
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Configuration des permissions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Permissions de base</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Lecture (canView)</li>
                    <li>• Édition (canEdit)</li>
                    <li>• Vote (canVote)</li>
                    <li>• Voir résultats (canSeeVoteResults)</li>
                  </ul>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Permissions avancées</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Gérer agenda (canManageAgenda)</li>
                    <li>• Gérer participants (canManageParticipants)</li>
                    <li>• Créer réunions (canCreateMeetings)</li>
                  </ul>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Permissions administrateur</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Gérer utilisateurs (canManageUsers)</li>
                    <li>• Accès administration</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Modal édition rôle */}
        <Dialog open={!!editingRole} onOpenChange={() => setEditingRole(null)}>
          <DialogContent className="bg-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Éditer le rôle {editingRole === "salarie" ? "Salarié·es SCC" : editingRole === "elu" ? "Elu·es" : ""}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Nom du rôle</Label>
                  <Input
                    readOnly
                    value={editingRole === "salarie" ? "Salarié·es SCC" : editingRole === "elu" ? "Elu·es" : ""}
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    defaultValue={editingRole === "salarie" ? "Rôle par défaut pour les salariés de SCC" : "Rôle pour les membres élus du conseil"}
                  />
                </div>
              </div>

              <div>
                <Label className="text-base font-semibold">Permissions</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Permissions de base</h4>
                    <div className="space-y-2">
                      <PermissionCheckbox 
                        id="edit-canView" 
                        label="Lecture des réunions"
                        defaultChecked={true}
                        roleKey={editingRole}
                        permission="canView"
                      />
                      <PermissionCheckbox 
                        id="edit-canEdit" 
                        label="Édition des contenus"
                        defaultChecked={false}
                        roleKey={editingRole}
                        permission="canEdit"
                      />
                      <PermissionCheckbox 
                        id="edit-canVote" 
                        label="Droit de vote"
                        defaultChecked={true}
                        roleKey={editingRole}
                        permission="canVote"
                      />
                      <PermissionCheckbox 
                        id="edit-canSeeVoteResults" 
                        label="Voir les résultats de vote"
                        defaultChecked={true}
                        roleKey={editingRole}
                        permission="canSeeVoteResults"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Permissions avancées</h4>
                    <div className="space-y-2">
                      <PermissionCheckbox 
                        id="edit-canManageAgenda" 
                        label="Gérer l'agenda"
                        defaultChecked={editingRole === "elu"}
                        roleKey={editingRole}
                        permission="canManageAgenda"
                      />
                      <PermissionCheckbox 
                        id="edit-canManageParticipants" 
                        label="Gérer les participants"
                        defaultChecked={editingRole === "elu"}
                        roleKey={editingRole}
                        permission="canManageParticipants"
                      />
                      <PermissionCheckbox 
                        id="edit-canCreateMeetings" 
                        label="Créer des réunions"
                        defaultChecked={editingRole === "elu"}
                        roleKey={editingRole}
                        permission="canCreateMeetings"
                      />
                      <PermissionCheckbox 
                        id="edit-canManageUsers" 
                        label="Gérer les utilisateurs"
                        defaultChecked={editingRole === "elu"}
                        roleKey={editingRole}
                        permission="canManageUsers"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setEditingRole(null)}
                >
                  Annuler
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    console.log('Role save button clicked!');
                    
                    // Collecter les valeurs des permissions depuis les checkboxes
                    const permissions = {
                      canView: (document.getElementById('edit-canView') as HTMLInputElement)?.checked || false,
                      canEdit: (document.getElementById('edit-canEdit') as HTMLInputElement)?.checked || false,
                      canVote: (document.getElementById('edit-canVote') as HTMLInputElement)?.checked || false,
                      canSeeVoteResults: (document.getElementById('edit-canSeeVoteResults') as HTMLInputElement)?.checked || false,
                      canManageAgenda: (document.getElementById('edit-canManageAgenda') as HTMLInputElement)?.checked || false,
                      canManageParticipants: (document.getElementById('edit-canManageParticipants') as HTMLInputElement)?.checked || false,
                      canCreateMeetings: (document.getElementById('edit-canCreateMeetings') as HTMLInputElement)?.checked || false,
                      canManageUsers: (document.getElementById('edit-canManageUsers') as HTMLInputElement)?.checked || false,
                    };
                    
                    console.log('Permissions sauvegardées:', permissions);
                    console.log('Pour le rôle:', editingRole);
                    
                    // Stocker les permissions dans le localStorage pour simulation
                    const roleKey = `permissions_${editingRole}`;
                    localStorage.setItem(roleKey, JSON.stringify(permissions));
                    
                    toast({
                      title: "Succès",
                      description: `Permissions du rôle ${editingRole === "salarie" ? "Salarié·es SCC" : "Elu·es"} sauvegardées`,
                    });
                    setEditingRole(null);
                  }}
                >
                  Sauvegarder
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal création rôle personnalisé */}
        <Dialog open={showCreateRoleModal} onOpenChange={setShowCreateRoleModal}>
          <DialogContent className="bg-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Créer un rôle personnalisé</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="roleName">Nom du rôle</Label>
                  <Input
                    id="roleName"
                    placeholder="Ex: Administrateur, Modérateur..."
                  />
                </div>
                <div>
                  <Label htmlFor="roleColor">Couleur du rôle</Label>
                  <Input
                    id="roleColor"
                    type="color"
                    defaultValue="#6366f1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-base font-semibold">Permissions</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Permissions de base</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="canView" className="rounded" />
                        <Label htmlFor="canView" className="text-sm">Lecture des réunions</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="canEdit" className="rounded" />
                        <Label htmlFor="canEdit" className="text-sm">Édition des contenus</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="canVote" className="rounded" />
                        <Label htmlFor="canVote" className="text-sm">Droit de vote</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="canSeeVoteResults" className="rounded" />
                        <Label htmlFor="canSeeVoteResults" className="text-sm">Voir les résultats de vote</Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Permissions avancées</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="canManageAgenda" className="rounded" />
                        <Label htmlFor="canManageAgenda" className="text-sm">Gérer l'agenda</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="canManageParticipants" className="rounded" />
                        <Label htmlFor="canManageParticipants" className="text-sm">Gérer les participants</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="canCreateMeetings" className="rounded" />
                        <Label htmlFor="canCreateMeetings" className="text-sm">Créer des réunions</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="canManageUsers" className="rounded" />
                        <Label htmlFor="canManageUsers" className="text-sm">Gérer les utilisateurs</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateRoleModal(false)}
                >
                  Annuler
                </Button>
                <Button 
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Créer le rôle
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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

        {/* Modal création entreprise */}
        <Dialog open={showCreateCompanyModal} onOpenChange={setShowCreateCompanyModal}>
          <DialogContent className="bg-white max-w-md">
            <DialogHeader>
              <DialogTitle>Créer une nouvelle entreprise</DialogTitle>
            </DialogHeader>
            <Form {...companyForm}>
              <form onSubmit={companyForm.handleSubmit((data) => createCompanyMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={companyForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de l'entreprise *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Coopérative Alpha" />
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
                        <Input {...field} placeholder="12345678901234" />
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
                        <Input {...field} placeholder="Ex: Arts du cirque" />
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
                        <Input {...field} type="email" placeholder="contact@entreprise.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={companyForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="01 23 45 67 89" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex gap-2 pt-4">
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

        {/* Modal création utilisateur */}
        <Dialog open={showCreateUserModal} onOpenChange={setShowCreateUserModal}>
          <DialogContent className="bg-white max-w-md">
            <DialogHeader>
              <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
            </DialogHeader>
            <Form {...userForm}>
              <form onSubmit={userForm.handleSubmit((data) => createUserMutation.mutate(data))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={userForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prénom *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Jean" />
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
                          <Input {...field} placeholder="Dupont" />
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
                        <Input {...field} type="email" placeholder="jean.dupont@example.com" />
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
                      <FormLabel>Rôle principal</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un rôle principal" />
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

                <div>
                  <Label className="text-sm font-medium">Rôles additionnels</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="additional-salarie" 
                        className="rounded"
                      />
                      <Label htmlFor="additional-salarie" className="text-sm">Salarié·es SCC</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="additional-elu" 
                        className="rounded"
                      />
                      <Label htmlFor="additional-elu" className="text-sm">Elu·es</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="additional-admin" 
                        className="rounded"
                      />
                      <Label htmlFor="additional-admin" className="text-sm">Administrateur</Label>
                    </div>
                  </div>
                </div>

                <FormField
                  control={userForm.control}
                  name="companyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entreprise</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : null)} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une entreprise" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={userForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mot de passe *</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" placeholder="••••••••" />
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
                          <Input {...field} type="password" placeholder="••••••••" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
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

        {/* Modal édition entreprise */}
        <Dialog open={!!editingCompany} onOpenChange={() => setEditingCompany(null)}>
          <DialogContent className="bg-white max-w-md">
            <DialogHeader>
              <DialogTitle>Modifier l'entreprise</DialogTitle>
            </DialogHeader>
            <Form {...editCompanyForm}>
              <form onSubmit={editCompanyForm.handleSubmit((data) => {
                if (editingCompany) {
                  updateCompanyMutation.mutate({ id: editingCompany.id, data });
                }
              })} className="space-y-4">
                <FormField
                  control={editCompanyForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de l'entreprise *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Coopérative Alpha" />
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
                        <Input {...field} placeholder="12345678901234" />
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
                        <Input {...field} placeholder="Ex: Arts du cirque" />
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
                        <Input {...field} type="email" placeholder="contact@entreprise.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editCompanyForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="01 23 45 67 89" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex gap-2 pt-4">
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
          </DialogContent>
        </Dialog>

        {/* Modal édition utilisateur */}
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="bg-white max-w-md">
            <DialogHeader>
              <DialogTitle>Modifier l'utilisateur</DialogTitle>
            </DialogHeader>
            <Form {...editUserForm}>
              <form onSubmit={editUserForm.handleSubmit((data) => {
                if (editingUser) {
                  updateUserMutation.mutate({ id: editingUser.id, data });
                }
              })} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editUserForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prénom *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Jean" />
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
                          <Input {...field} placeholder="Dupont" />
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
                        <Input {...field} type="email" placeholder="jean.dupont@example.com" />
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
                  control={editUserForm.control}
                  name="companyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entreprise</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : null)} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une entreprise" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
                
                <div className="flex gap-2 pt-4">
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
          </DialogContent>
        </Dialog>

        {/* Modal édition type de réunion */}
        <Dialog open={!!editingMeetingType} onOpenChange={() => setEditingMeetingType(null)}>
          <DialogContent className="bg-white max-w-md">
            <DialogHeader>
              <DialogTitle>Modifier le type de réunion</DialogTitle>
            </DialogHeader>
            <Form {...editMeetingTypeForm}>
              <form onSubmit={editMeetingTypeForm.handleSubmit((data) => {
                console.log('Form submit data:', data);
                console.log('Form errors:', editMeetingTypeForm.formState.errors);
                if (editingMeetingType) {
                  updateMeetingTypeMutation.mutate({ id: editingMeetingType.id, data });
                }
              })} className="space-y-4">
                <FormField
                  control={editMeetingTypeForm.control}
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
                  control={editMeetingTypeForm.control}
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
                  control={editMeetingTypeForm.control}
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

                <div>
                  <Label className="text-sm font-medium">Rôles autorisés</Label>
                  <div className="mt-2 space-y-2">
                    {["Salarié·es SCC", "Elu·es"].map(availableRole => {
                      const isSelected = meetingTypeRoles?.some((r: any) => r.role === availableRole) || false;
                      return (
                        <div key={availableRole} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`role-${availableRole}`}
                            checked={isSelected}
                            onChange={(e) => {
                              if (editingMeetingType) {
                                if (e.target.checked) {
                                  addMeetingTypeRoleMutation.mutate({
                                    meetingTypeId: editingMeetingType.id,
                                    role: availableRole
                                  });
                                } else {
                                  const roleToRemove = meetingTypeRoles?.find((r: any) => r.role === availableRole);
                                  if (roleToRemove) {
                                    removeMeetingTypeRoleMutation.mutate(roleToRemove.id);
                                  }
                                }
                              }
                            }}
                            className="rounded"
                          />
                          <Label htmlFor={`role-${availableRole}`} className="text-sm cursor-pointer">
                            {availableRole}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Seuls les utilisateurs avec ces rôles pourront accéder à ce type de réunion
                  </p>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setEditingMeetingType(null)}
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateMeetingTypeMutation.isPending}
                  >
                    {updateMeetingTypeMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Modal gestion des accès */}
        <Dialog open={!!selectedMeetingType} onOpenChange={() => setSelectedMeetingType(null)}>
          <DialogContent className="bg-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Gestion des accès - {selectedMeetingType?.name}
              </DialogTitle>
            </DialogHeader>
            {selectedMeetingType && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Ajouter un accès utilisateur</h4>
                    <Select onValueChange={(userId) => {
                      if (userId && selectedMeetingType) {
                        addMeetingTypeAccessMutation.mutate({
                          meetingTypeId: selectedMeetingType.id,
                          data: { userId: parseInt(userId), accessLevel: 'read' }
                        });
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un utilisateur" />
                      </SelectTrigger>
                      <SelectContent>
                        {users?.filter((user: User) => 
                          !meetingTypeAccess?.some((access: any) => access.userId === user.id)
                        ).map((user: User) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.firstName} {user.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Ajouter un accès entreprise</h4>
                    <Select onValueChange={(companyId) => {
                      if (companyId && selectedMeetingType) {
                        addMeetingTypeAccessMutation.mutate({
                          meetingTypeId: selectedMeetingType.id,
                          data: { companyId: parseInt(companyId), accessLevel: 'read' }
                        });
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une entreprise" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies?.filter((company: Company) => 
                          !meetingTypeAccess?.some((access: any) => access.companyId === company.id)
                        ).map((company: Company) => (
                          <SelectItem key={company.id} value={company.id.toString()}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Rôles autorisés</h4>
                  <div className="space-y-2 mb-4">
                    {["Salarié·es SCC", "Elu·es"].map(availableRole => {
                      const isSelected = meetingTypeRoles?.some((r: any) => r.role === availableRole) || false;
                      return (
                        <div key={availableRole} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`access-role-${availableRole}`}
                            checked={isSelected}
                            onChange={(e) => {
                              if (selectedMeetingType) {
                                if (e.target.checked) {
                                  addMeetingTypeRoleMutation.mutate({
                                    meetingTypeId: selectedMeetingType.id,
                                    role: availableRole
                                  });
                                } else {
                                  const roleToRemove = meetingTypeRoles?.find((r: any) => r.role === availableRole);
                                  if (roleToRemove) {
                                    removeMeetingTypeRoleMutation.mutate(roleToRemove.id);
                                  }
                                }
                              }
                            }}
                            className="rounded"
                          />
                          <label htmlFor={`access-role-${availableRole}`} className="text-sm cursor-pointer">
                            {availableRole}
                          </label>
                        </div>
                      );
                    })}
                    <p className="text-xs text-gray-500 mt-2">
                      Seuls les utilisateurs avec ces rôles pourront accéder à ce type de réunion
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Accès actuels</h4>
                  <div className="space-y-2">
                    {accessLoading ? (
                      <div className="text-center py-4">Chargement des accès...</div>
                    ) : meetingTypeAccess?.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">Aucun accès configuré</div>
                    ) : (
                      meetingTypeAccess?.map((access: any) => (
                        <div key={access.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <span className="font-medium">
                              {access.user ? 
                                `${access.user.firstName} ${access.user.lastName}` : 
                                access.company?.name
                              }
                            </span>
                            <Badge variant="secondary" className="ml-2">
                              {access.user ? 'Utilisateur' : 'Entreprise'}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMeetingTypeAccessMutation.mutate(access.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}