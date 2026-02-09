import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DealImportantDate {
  id: string;
  deal_id: string;
  description: string;
  due_date: string | null;
  is_completed: boolean;
  created_at: string;
}

export function useDealImportantDates(dealId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['deal_important_dates', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      const { data, error } = await supabase
        .from('deal_important_dates')
        .select('*')
        .eq('deal_id', dealId)
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as DealImportantDate[];
    },
    enabled: !!user && !!dealId,
  });

  const addDate = async (item: { description: string; due_date?: string }) => {
    if (!dealId) return;
    try {
      const { error } = await supabase
        .from('deal_important_dates')
        .insert({ deal_id: dealId, description: item.description, due_date: item.due_date || null });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['deal_important_dates', dealId] });
      toast.success('Date added');
    } catch (error) {
      console.error('Error adding date:', error);
      toast.error('Failed to add date');
    }
  };

  const updateDate = async (id: string, updates: Partial<DealImportantDate>) => {
    try {
      const { error } = await supabase
        .from('deal_important_dates')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['deal_important_dates', dealId] });
      toast.success('Date updated');
    } catch (error) {
      console.error('Error updating date:', error);
      toast.error('Failed to update date');
    }
  };

  const deleteDate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('deal_important_dates')
        .delete()
        .eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['deal_important_dates', dealId] });
      toast.success('Date deleted');
    } catch (error) {
      console.error('Error deleting date:', error);
      toast.error('Failed to delete date');
    }
  };

  return {
    importantDates: query.data || [],
    isLoading: query.isLoading,
    addDate,
    updateDate,
    deleteDate,
  };
}
