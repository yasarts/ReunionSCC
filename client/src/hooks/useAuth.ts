import { useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId?: number;
  permissions: {
    canEdit: boolean;
    canManageAgenda: boolean;
    canManageUsers: boolean;
    canCreateMeetings: boolean;
    canExport?: boolean;
    canVote: boolean;
    canSeeVoteResults: boolean;
    canManageParticipants: boolean;
  };
}

export function useAuth() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async (): Promise<User | null> => {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          return null;
        }
        throw new Error('Failed to fetch user');
      }
      
      return response.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const login = async (credentials: { email: string; password: string }) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Login failed');
    }

    const userData = await response.json();
    
    // Invalider les requêtes d'auth pour refetch
    queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    
    return userData;
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Invalider toutes les requêtes et rediriger
      queryClient.clear();
      setLocation('/login');
      window.location.reload();
    }
  };

  const requirePermission = (permission: keyof User['permissions']) => {
    return user?.permissions[permission] || false;
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    requirePermission
  };
}