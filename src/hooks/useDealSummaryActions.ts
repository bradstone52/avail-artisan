import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DealSummaryAction {
  id: string;
  deal_id: string;
  due_date: string | null;
  due_time: string | null;
  date_met: string | null;
  acting_party: string | null;
  description: string;
  sort_order: number;
  created_at: string;
}

export function useDealSummaryActions(dealId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: actions = [], isLoading, error } = useQuery({
    queryKey: ['deal_summary_actions', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      const { data, error } = await supabase
        .from('deal_summary_actions')
        .select('*')
        .eq('deal_id', dealId)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as DealSummaryAction[];
    },
    enabled: !!dealId,
  });

  const saveActions = useMutation({
    mutationFn: async (newActions: Omit<DealSummaryAction, 'id' | 'created_at'>[]) => {
      if (!dealId) throw new Error('No deal ID provided');

      // Delete existing actions for this deal
      await supabase
        .from('deal_summary_actions')
        .delete()
        .eq('deal_id', dealId);

      // Insert new actions if any have content
      const actionsToInsert = newActions.filter(a => a.description || a.due_date);
      if (actionsToInsert.length > 0) {
        const { error } = await supabase
          .from('deal_summary_actions')
          .insert(actionsToInsert);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal_summary_actions', dealId] });
    },
    onError: (error) => {
      console.error('Error saving actions:', error);
      toast.error('Failed to save actions');
    },
  });

  return {
    actions,
    isLoading,
    error,
    saveActions: saveActions.mutateAsync,
  };
}
