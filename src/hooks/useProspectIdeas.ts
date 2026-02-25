import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrg } from '@/hooks/useOrg';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ProspectIdea {
  id: string;
  org_id: string | null;
  created_by: string;
  name: string;
  title: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  notes: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProspectIdeaInsert {
  name: string;
  title?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  notes?: string | null;
  source?: string;
}

export function useProspectIdeas() {
  const { orgId } = useOrg();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: ['prospect_ideas', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('prospect_ideas' as never)
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProspectIdea[];
    },
    enabled: !!orgId,
  });

  const addIdea = useMutation({
    mutationFn: async (idea: ProspectIdeaInsert) => {
      if (!orgId || !user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('prospect_ideas' as never)
        .insert({ ...idea, org_id: orgId, created_by: user.id } as never)
        .select()
        .single();
      if (error) throw error;
      return data as ProspectIdea;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prospect_ideas', orgId] });
      toast.success('Saved as Prospect Idea');
    },
    onError: (e) => toast.error(`Failed to save: ${e.message}`),
  });

  const deleteIdea = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('prospect_ideas' as never)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prospect_ideas', orgId] });
      toast.success('Prospect idea removed');
    },
    onError: (e) => toast.error(`Failed to delete: ${e.message}`),
  });

  return { ideas, isLoading, addIdea, deleteIdea };
}
