import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Issue } from '@/lib/types';

export function useIssues() {
  const { user } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIssues = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching issues:', error);
      return;
    }

    setIssues(data as Issue[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const createIssue = async (issueData: Omit<Partial<Issue>, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) throw new Error('Not authenticated');

    const insertData = {
      title: issueData.title || '',
      market: issueData.market || 'Calgary Region',
      size_threshold: issueData.size_threshold || 100000,
      sort_order: issueData.sort_order || 'size_desc',
      brokerage_name: issueData.brokerage_name,
      logo_url: issueData.logo_url,
      primary_contact_name: issueData.primary_contact_name,
      primary_contact_email: issueData.primary_contact_email,
      primary_contact_phone: issueData.primary_contact_phone,
      total_listings: issueData.total_listings || 0,
      new_count: issueData.new_count || 0,
      changed_count: issueData.changed_count || 0,
      removed_count: issueData.removed_count || 0,
      published_at: issueData.published_at,
      is_public: issueData.is_public || false,
      user_id: user.id,
    };

    const { data, error } = await supabase
      .from('issues')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    await fetchIssues();
    return data as Issue;
  };

  const updateIssue = async (id: string, updates: Partial<Issue>) => {
    const { error } = await supabase
      .from('issues')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    await fetchIssues();
  };

  const getLatestIssue = useCallback(() => {
    return issues.length > 0 ? issues[0] : null;
  }, [issues]);

  return {
    issues,
    loading,
    createIssue,
    updateIssue,
    getLatestIssue,
    refreshIssues: fetchIssues,
  };
}
