import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Org {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
}

interface OrgMember {
  org_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

/**
 * Hook to manage user's organization.
 * On login, ensures user belongs to an org (creates "ClearView" if none).
 */
export function useOrg() {
  const { user } = useAuth();
  const [org, setOrg] = useState<Org | null>(null);
  const [orgRole, setOrgRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureOrg = useCallback(async () => {
    if (!user) {
      setOrg(null);
      setOrgRole(null);
      setLoading(false);
      return;
    }

    try {
      // Call the database function to ensure user has an org
      const { data: orgId, error: ensureError } = await supabase.rpc('ensure_user_org', {
        _user_id: user.id,
      });

      if (ensureError) {
        console.error('Error ensuring user org:', ensureError);
        setLoading(false);
        return;
      }

      // Fetch the org details
      const { data: orgData, error: orgError } = await supabase
        .from('orgs')
        .select('*')
        .eq('id', orgId)
        .single();

      if (orgError) {
        console.error('Error fetching org:', orgError);
      } else {
        setOrg(orgData);
      }

      // Fetch user's role in this org
      const { data: memberData, error: memberError } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', orgId)
        .eq('user_id', user.id)
        .single();

      if (memberError) {
        console.error('Error fetching org member role:', memberError);
      } else {
        setOrgRole(memberData?.role || 'member');
      }
    } catch (err) {
      console.error('Error in useOrg:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    ensureOrg();
  }, [ensureOrg]);

  return {
    org,
    orgId: org?.id || null,
    orgName: org?.name || null,
    inviteCode: org?.invite_code || null,
    orgRole,
    isOrgAdmin: orgRole === 'admin',
    loading,
    refreshOrg: ensureOrg,
  };
}
