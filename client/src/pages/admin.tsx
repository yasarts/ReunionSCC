import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Users, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'Salarié·es SCC' | 'Elu·es';
  permissions: {
    canEdit: boolean;
    canManageAgenda: boolean;
    canManageUsers: boolean;
    canCreateMeetings: boolean;
    canExport: boolean;
  };
  createdAt: string;
}

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const { user, requirePermission } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [users, setUsers] = useState<User[]>([
    {
      id: 1,
      email: 'salarie@scc.fr',
      firstName: 'Marie',
      lastName: 'Dupont',
      role: 'Salarié·es SCC',
      permissions: {
        canEdit: true,
        canManageAgenda: true,
        canManageUsers: true,
        canCreateMeetings: true,
        canExport: true
      },
      createdAt: '2024-01-15'
    },
    {
      id: 2,
      email: 'elu@scc.fr',
      firstName: 'Jean',
      lastName: 'Martin',
      role: 'Elu·es',
      permissions: {
        canEdit: false,
        canManageAgenda: false,
        canManageUsers: false,
        canCreateMeetings: false,
        canExport: false
      },
      createdAt: '2024-02-01'
    }
  ]);

  const [newUser, setNewUser] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'Elu·es' as 'Salarié·es SCC' | 'Elu·es'
  });

  if (!requirePermission('canManageUsers')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Accès non autorisé</h2>
            <p className="text-gray-600 mb-4">Vous n'avez pas les permissions pour accéder à cette page.</p>
            <Button onClick={() => setLocation('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const createUser = () => {
    const permissions = newUser.role === 'Salarié·es SCC' ? {
      canEdit: true,
      canManageAgenda: true,
      canManageUsers: true,
      canCreateMeetings: true,
      canExport: true
    } : {
      canEdit: false,
      canManageAgenda: false,
      canManageUsers: false,
      canCreateMeetings: false,
      canExport: false
    };

    const user: User = {
      id: Date.now(),
      ...newUser,
      permissions,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setUsers([...users, user]);
    setShowCreateModal(false);
    setNewUser({
      email: '',
      firstName: '',
      lastName: '',
      role: 'Elu·es'
    });
  };

  const deleteUser = (userId: number) => {
    setUsers(users.filter(u => u.id !== userId));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation('/')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Administration des utilisateurs</h1>
              <p className="text-gray-600">Gérez les accès et permissions des utilisateurs</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Utilisateurs ({users.length})</h2>
          </div>
          
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvel utilisateur
          </Button>
        </div>

        <div className="grid gap-4">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{user.firstName} {user.lastName}</h3>
                      <Badge variant={user.role === 'Salarié·es SCC' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{user.email}</p>
                    <p className="text-xs text-gray-500">Créé le {user.createdAt}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="text-right text-xs text-gray-500">
                      <div>Permissions:</div>
                      <div className="space-x-1 mt-1">
                        {user.permissions.canCreateMeetings && <span className="bg-green-100 text-green-800 px-1 rounded">Créer</span>}
                        {user.permissions.canManageAgenda && <span className="bg-blue-100 text-blue-800 px-1 rounded">Agenda</span>}
                        {user.permissions.canEdit && <span className="bg-orange-100 text-orange-800 px-1 rounded">Éditer</span>}
                        {user.permissions.canExport && <span className="bg-purple-100 text-purple-800 px-1 rounded">Export</span>}
                        {user.permissions.canManageUsers && <span className="bg-red-100 text-red-800 px-1 rounded">Admin</span>}
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteUser(user.id)}
                      disabled={user.id === 1} // Protéger le compte admin principal
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Modal de création d'utilisateur */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                value={newUser.firstName}
                onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
                placeholder="Prénom"
              />
            </div>
            
            <div>
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                value={newUser.lastName}
                onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
                placeholder="Nom"
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                placeholder="email@scc.fr"
              />
            </div>
            
            <div>
              <Label htmlFor="role">Rôle</Label>
              <select
                id="role"
                value={newUser.role}
                onChange={(e) => setNewUser({...newUser, role: e.target.value as 'Salarié·es SCC' | 'Elu·es'})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="Elu·es">Elu·es</option>
                <option value="Salarié·es SCC">Salarié·es SCC</option>
              </select>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium mb-2">Permissions automatiques :</h4>
              <div className="text-sm text-gray-600">
                {newUser.role === 'Salarié·es SCC' ? (
                  <p>Accès complet : création, édition, gestion agenda, administration, export</p>
                ) : (
                  <p>Accès en lecture seule : consultation uniquement</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Annuler
              </Button>
              <Button 
                onClick={createUser}
                disabled={!newUser.email || !newUser.firstName || !newUser.lastName}
              >
                Créer l'utilisateur
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}