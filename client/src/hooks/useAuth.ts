import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: {
    canEdit: boolean;
    canManageAgenda: boolean;
    canManageUsers: boolean;
    canCreateMeetings: boolean;
    canExport: boolean;
  };
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (error) {
          localStorage.removeItem('user');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
    
    // Écouter les changements de localStorage
    const handleStorageChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setLocation('/login');
  };

  const requirePermission = (permission: keyof User['permissions']) => {
    return user?.permissions[permission] || false;
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
    requirePermission
  };
}