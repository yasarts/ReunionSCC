import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';

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
    canExport?: boolean;
    canVote: boolean;
    canSeeVoteResults: boolean;
    canManageParticipants: boolean;
  };
}

export function useAuth() {
  const [, setLocation] = useLocation();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
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

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
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
    logout,
    requirePermission
  };
}