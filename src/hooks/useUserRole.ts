import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'admin' | 'sync_operator' | 'member';

interface UseUserRoleReturn {
  role: AppRole | null;
  isAdmin: boolean;
  isSyncOperator: boolean;
  canRunSync: boolean;
  loading: boolean;
  refetchRole: () => Promise<void>;
}

export function useUserRole(): UseUserRoleReturn {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = useCallback(async () => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
      } else if (data) {
        setRole(data.role as AppRole);
      } else {
        // User has no role assigned - treat as member
        setRole('member');
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  const isAdmin = role === 'admin';
  const isSyncOperator = role === 'sync_operator';
  const canRunSync = isAdmin || isSyncOperator;

  return {
    role,
    isAdmin,
    isSyncOperator,
    canRunSync,
    loading,
    refetchRole: fetchRole,
  };
}
