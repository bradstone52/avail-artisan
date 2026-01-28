import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DealCondition {
  id: string;
  deal_id: string;
  description: string;
  due_date: string | null;
  is_satisfied: boolean;
  created_at: string;
}

export function useDealConditions(dealId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['deal_conditions', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      
      const { data, error } = await supabase
        .from('deal_conditions')
        .select('*')
        .eq('deal_id', dealId)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as DealCondition[];
    },
    enabled: !!user && !!dealId,
  });

  const addCondition = async (condition: { description: string; due_date?: string }) => {
    if (!dealId) return;

    try {
      const { error } = await supabase
        .from('deal_conditions')
        .insert({
          deal_id: dealId,
          description: condition.description,
          due_date: condition.due_date || null,
        });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['deal_conditions', dealId] });
      toast.success('Condition added');
    } catch (error) {
      console.error('Error adding condition:', error);
      toast.error('Failed to add condition');
    }
  };

  const updateCondition = async (id: string, updates: Partial<DealCondition>) => {
    try {
      const { error } = await supabase
        .from('deal_conditions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['deal_conditions', dealId] });
      toast.success('Condition updated');
    } catch (error) {
      console.error('Error updating condition:', error);
      toast.error('Failed to update condition');
    }
  };

  const deleteCondition = async (id: string) => {
    try {
      const { error } = await supabase
        .from('deal_conditions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['deal_conditions', dealId] });
      toast.success('Condition deleted');
    } catch (error) {
      console.error('Error deleting condition:', error);
      toast.error('Failed to delete condition');
    }
  };

  return {
    conditions: query.data || [],
    isLoading: query.isLoading,
    addCondition,
    updateCondition,
    deleteCondition,
  };
}
