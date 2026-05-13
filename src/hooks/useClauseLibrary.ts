import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';
import { toast } from 'sonner';
import type { ClauseLibraryItem } from '@/types/database';

export function useClauseLibrary(documentType: string) {
  const { user } = useAuth();
  const { org } = useOrg();

  return useQuery({
    queryKey: ['clause_library', org?.id, documentType],
    queryFn: async () => {
      if (!org?.id) return [];

      const { data, error } = await supabase
        .from('clause_library')
        .select('*')
        .eq('org_id', org.id)
        .eq('document_type', documentType)
        .order('title', { ascending: true });

      if (error) throw error;
      return data as ClauseLibraryItem[];
    },
    enabled: !!user && !!org?.id,
  });
}

export function useCreateClause() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { org } = useOrg();

  return useMutation({
    mutationFn: async (formData: { title: string; content: string; document_type: string }) => {
      if (!user?.id || !org?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('clause_library')
        .insert({
          ...formData,
          user_id: user.id,
          org_id: org.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ClauseLibraryItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clause_library'] });
      toast.success('Clause saved');
    },
    onError: (error) => {
      console.error('Error creating clause:', error);
      toast.error('Failed to save clause');
    },
  });
}

export function useUpdateClause() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, title, content }: { id: string; title: string; content: string }) => {
      const { data, error } = await supabase
        .from('clause_library')
        .update({ title, content })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ClauseLibraryItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clause_library'] });
      toast.success('Clause updated');
    },
    onError: (error) => {
      console.error('Error updating clause:', error);
      toast.error('Failed to update clause');
    },
  });
}

export function useDeleteClause() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clause_library')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clause_library'] });
      toast.success('Clause deleted');
    },
    onError: (error) => {
      console.error('Error deleting clause:', error);
      toast.error('Failed to delete clause');
    },
  });
}
