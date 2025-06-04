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
          const userData = JSON.parse(storedUser);
          setUser(userData);
        } catch (error) {
          localStorage.removeItem('user');
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    checkAuth();
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