import { useState } from 'react';
import { useLocation } from 'wouter';
import { LogIn, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Simulation de connexion avec utilisateurs prédéfinis
      if (email === 'salarie@scc.fr' && password === 'password') {
        localStorage.setItem('user', JSON.stringify({
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
          }
        }));
        toast({
          title: "Connexion réussie",
          description: "Bienvenue Marie",
        });
        // Forcer le rechargement de la page pour actualiser l'état d'authentification
        window.location.href = '/';
      } else if (email === 'elu@scc.fr' && password === 'password') {
        localStorage.setItem('user', JSON.stringify({
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
          }
        }));
        toast({
          title: "Connexion réussie",
          description: "Bienvenue Jean",
        });
        // Forcer le rechargement de la page pour actualiser l'état d'authentification
        window.location.href = '/';
      } else {
        toast({
          title: "Erreur de connexion",
          description: "Email ou mot de passe incorrect",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la connexion",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl">Connexion SCC</CardTitle>
          <p className="text-gray-600">Gestion des réunions du Conseil National</p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.fr"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                "Connexion..."
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Se connecter
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">Comptes de démonstration :</h4>
            <div className="text-sm space-y-1">
              <p><strong>Salarié·es SCC:</strong> salarie@scc.fr / password</p>
              <p><strong>Elu·es:</strong> elu@scc.fr / password</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}