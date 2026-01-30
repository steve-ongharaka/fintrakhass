'use client';

import { useSession } from 'next-auth/react';
import { useMemo } from 'react';

export type UserRole = 'admin' | 'operator' | 'viewer';

export function useUserRole() {
  const { data: session, status } = useSession();

  const userRole = useMemo(() => {
    if (status === 'loading' || !session?.user) {
      return 'viewer' as UserRole;
    }
    
    try {
      const role = (session.user as any)?.role;
      if (role === 'admin' || role === 'operator' || role === 'viewer') {
        return role as UserRole;
      }
      return 'viewer' as UserRole;
    } catch (error) {
      console.error('Error accessing user role:', error);
      return 'viewer' as UserRole;
    }
  }, [session, status]);

  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';
  const canEdit = userRole !== 'viewer';
  const isAdmin = userRole === 'admin';
  const isOperator = userRole === 'operator';

  return {
    userRole,
    isLoading,
    isAuthenticated,
    canEdit,
    isAdmin,
    isOperator,
    session,
  };
}
