import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Lock, CheckCircle, AlertCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

const loginSchema = z.object({
  email: z.string().email("Format d'email invalide"),
  password: z.string().min(1, "Le mot de passe est requis")
});

const magicLinkSchema = z.object({
  email: z.string().email("Format d'email invalide")
});

type LoginFormData = z.infer<typeof loginSchema>;
type MagicLinkFormData = z.infer<typeof magicLinkSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const magicLinkForm = useForm<MagicLinkFormData>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: {
      email: ""
    }
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Rediriger vers le dashboard et recharger la page pour que useAuth récupère les données
      window.location.href = "/dashboard";
    },
    onError: (error: any) => {
      console.error("Login error:", error);
    }
  });

  const magicLinkMutation = useMutation({
    mutationFn: async (data: MagicLinkFormData) => {
      const response = await fetch("/api/auth/send-magic-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send magic link");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setMagicLinkSent(true);
    },
    onError: (error: any) => {
      console.error("Magic link error:", error);
    }
  });

  const onLoginSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const onMagicLinkSubmit = (data: MagicLinkFormData) => {
    magicLinkMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            SCC - Connexion
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">
            Accédez au système de gestion des réunions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="password" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Mot de passe
              </TabsTrigger>
              <TabsTrigger value="magic-link" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Lien magique
              </TabsTrigger>
            </TabsList>

            <TabsContent value="password" className="space-y-4">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="votre@email.com" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mot de passe</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Votre mot de passe" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {loginMutation.isError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {loginMutation.error?.message || "Erreur de connexion. Vérifiez vos identifiants."}
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Connexion..." : "Se connecter"}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="magic-link" className="space-y-4">
              {!magicLinkSent ? (
                <Form {...magicLinkForm}>
                  <form onSubmit={magicLinkForm.handleSubmit(onMagicLinkSubmit)} className="space-y-4">
                    <FormField
                      control={magicLinkForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="votre@email.com" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {magicLinkMutation.isError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {magicLinkMutation.error?.message || "Erreur lors de l'envoi du lien magique."}
                        </AlertDescription>
                      </Alert>
                    )}
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={magicLinkMutation.isPending}
                    >
                      {magicLinkMutation.isPending ? "Envoi..." : "Envoyer le lien magique"}
                    </Button>
                  </form>
                </Form>
              ) : (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Lien envoyé !</p>
                      <p className="text-sm">
                        Si cette adresse email est enregistrée, vous recevrez un lien de connexion sécurisé.
                        Vérifiez vos emails et cliquez sur le lien pour vous connecter.
                      </p>
                      <p className="text-xs text-gray-600">
                        Le lien est valable pendant 15 minutes.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              {magicLinkSent && (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => {
                    setMagicLinkSent(false);
                    magicLinkForm.reset();
                  }}
                >
                  Renvoyer un lien
                </Button>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Comptes de test disponibles :
            </p>
            <div className="mt-2 space-y-1 text-xs text-gray-500">
              <p>Admin: admin@scc-cirque.org / admin123</p>
              <p>Membre: christine.nissim@scc-cirque.org / membre123</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}