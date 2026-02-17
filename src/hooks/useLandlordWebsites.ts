import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';
import { toast } from 'sonner';

export interface LandlordWebsite {
  id: string;
  org_id: string;
  landlord_name: string;
  website_url: string;
  notes: string | null;
  last_crawled_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export function useLandlordWebsites() {
  const { user } = useAuth();
  const { orgId } = useOrg();
  const [websites, setWebsites] = useState<LandlordWebsite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWebsites = useCallback(async () => {
    if (!user || !orgId) return;
    const { data, error } = await supabase
      .from('landlord_websites')
      .select('*')
      .eq('org_id', orgId)
      .order('landlord_name');
    if (error) {
      console.error('Error fetching landlord websites:', error);
    } else {
      setWebsites((data as unknown as LandlordWebsite[]) || []);
    }
    setLoading(false);
  }, [user, orgId]);

  useEffect(() => {
    fetchWebsites();
  }, [fetchWebsites]);

  const addWebsite = async (landlordName: string, websiteUrl: string, notes?: string) => {
    if (!user || !orgId) return;
    const { error } = await supabase.from('landlord_websites').insert({
      org_id: orgId,
      landlord_name: landlordName,
      website_url: websiteUrl,
      notes: notes || null,
      created_by: user.id,
    });
    if (error) {
      if (error.code === '23505') {
        toast.error('A website URL already exists for this landlord');
      } else {
        toast.error('Failed to add website');
      }
      return;
    }
    toast.success('Website added');
    await fetchWebsites();
  };

  const updateWebsite = async (id: string, updates: Partial<Pick<LandlordWebsite, 'website_url' | 'notes' | 'last_crawled_at'>>) => {
    const { error } = await supabase.from('landlord_websites').update(updates).eq('id', id);
    if (error) {
      toast.error('Failed to update website');
      return;
    }
    await fetchWebsites();
  };

  const deleteWebsite = async (id: string) => {
    const { error } = await supabase.from('landlord_websites').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete website');
      return;
    }
    toast.success('Website removed');
    await fetchWebsites();
  };

  return { websites, loading, addWebsite, updateWebsite, deleteWebsite, refetch: fetchWebsites };
}
