import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();
  const { login, isLoggingIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await login({ email, password });
      // Redirect to dashboard after successful login
      setLocation("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion échouée");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
            <Users className="h-8 w-8 text-indigo-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">
            🎪 Conseil National SCC
          </CardTitle>
          <CardDescription>
            Connexion à l'application de réunion
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                disabled={isLoggingIn}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isLoggingIn}
              />
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700" 
              disabled={isLoggingIn}
            >
              {isLoggingIn ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-500 space-y-1">
            <p>Comptes de test :</p>
            <p className="text-xs">Admin: admin@scc-cirque.org / admin123</p>
            <p className="text-xs">Membre: christine.nissim@scc-cirque.org / membre123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
