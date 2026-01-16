import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';
import { toast } from 'sonner';

export interface Invite {
  id: string;
  code: string;
  org_id: string;
  role: string;
  invited_email: string | null;
  invited_domain: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  used_at: string | null;
  used_by_user_id: string | null;
  used_by_email: string | null;
  created_by_user_id: string;
  created_at: string;
}

export interface CreateInviteParams {
  role?: string;
  invited_email?: string;
  invited_domain?: string;
  expires_at?: string;
}

export function useInvites() {
  const { user, session } = useAuth();
  const { org } = useOrg();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchInvites = useCallback(async () => {
    if (!org?.id) {
      setInvites([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invites')
        .select('*')
        .eq('org_id', org.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvites((data as Invite[]) || []);
    } catch (error) {
      console.error('Error fetching invites:', error);
      toast.error('Failed to load invites');
    } finally {
      setLoading(false);
    }
  }, [org?.id]);

  useEffect(() => {
    if (org?.id) {
      fetchInvites();
    }
  }, [org?.id, fetchInvites]);

  const createInvite = async (params: CreateInviteParams = {}) => {
    if (!org?.id || !user?.id) {
      toast.error('Not authenticated');
      return null;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('invites')
        .insert({
          org_id: org.id,
          role: params.role || 'member',
          invited_email: params.invited_email?.toLowerCase() || null,
          invited_domain: params.invited_domain?.toLowerCase() || null,
          expires_at: params.expires_at || null,
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Invite created');
      await fetchInvites();
      return data as Invite;
    } catch (error) {
      console.error('Error creating invite:', error);
      toast.error('Failed to create invite');
      return null;
    } finally {
      setCreating(false);
    }
  };

  const revokeInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('invites')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', inviteId);

      if (error) throw error;
      
      toast.success('Invite revoked');
      await fetchInvites();
    } catch (error) {
      console.error('Error revoking invite:', error);
      toast.error('Failed to revoke invite');
    }
  };

  const regenerateInvite = async (oldInviteId: string) => {
    const oldInvite = invites.find(i => i.id === oldInviteId);
    if (!oldInvite) return null;

    // Revoke old invite
    await revokeInvite(oldInviteId);

    // Create new invite with same settings
    return createInvite({
      role: oldInvite.role,
      invited_email: oldInvite.invited_email || undefined,
      invited_domain: oldInvite.invited_domain || undefined,
      expires_at: oldInvite.expires_at || undefined,
    });
  };

  const redeemInvite = async (inviteCode: string) => {
    if (!session?.access_token) {
      toast.error('Please sign in first');
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('redeem-invite', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { inviteCode: inviteCode.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to redeem invite';
      return { success: false, error: message };
    }
  };

  const getInviteStatus = (invite: Invite): 'unused' | 'used' | 'expired' | 'revoked' => {
    if (invite.revoked_at) return 'revoked';
    if (invite.used_at) return 'used';
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) return 'expired';
    return 'unused';
  };

  const getInviteLink = (code: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/join?code=${code}`;
  };

  return {
    invites,
    loading,
    creating,
    fetchInvites,
    createInvite,
    revokeInvite,
    regenerateInvite,
    redeemInvite,
    getInviteStatus,
    getInviteLink,
  };
}
