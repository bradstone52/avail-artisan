import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DealDeposit {
  id: string;
  deal_id: string;
  amount: number;
  held_by: string | null;
  due_date: string | null;
  received: boolean;
  created_at: string;
}

export function useDealDeposits(dealId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['deal_deposits', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      
      const { data, error } = await supabase
        .from('deal_deposits')
        .select('*')
        .eq('deal_id', dealId)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as DealDeposit[];
    },
    enabled: !!user && !!dealId,
  });

  const addDeposit = async (deposit: { amount: number; held_by?: string; due_date?: string }) => {
    if (!dealId) return;

    try {
      const { error } = await supabase
        .from('deal_deposits')
        .insert({
          deal_id: dealId,
          amount: deposit.amount,
          held_by: deposit.held_by || null,
          due_date: deposit.due_date || null,
        });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['deal_deposits', dealId] });
      toast.success('Deposit added');
    } catch (error) {
      console.error('Error adding deposit:', error);
      toast.error('Failed to add deposit');
    }
  };

  const updateDeposit = async (id: string, updates: Partial<DealDeposit>) => {
    // Optimistically update the cache
    const previousDeposits = queryClient.getQueryData<DealDeposit[]>(['deal_deposits', dealId]);
    if (previousDeposits) {
      queryClient.setQueryData<DealDeposit[]>(['deal_deposits', dealId], 
        previousDeposits.map(d => d.id === id ? { ...d, ...updates } : d)
      );
    }

    try {
      const { error, data } = await supabase
        .from('deal_deposits')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('No rows updated — you may not have permission');
      }

      queryClient.invalidateQueries({ queryKey: ['deal_deposits', dealId] });
      toast.success('Deposit updated');
    } catch (error: any) {
      console.error('Error updating deposit:', error);
      // Rollback optimistic update
      if (previousDeposits) {
        queryClient.setQueryData(['deal_deposits', dealId], previousDeposits);
      }
      toast.error(error?.message || 'Failed to update deposit');
    }
  };

  const deleteDeposit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('deal_deposits')
        .delete()
        .eq('id', id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['deal_deposits', dealId] });
      toast.success('Deposit deleted');
    } catch (error) {
      console.error('Error deleting deposit:', error);
      toast.error('Failed to delete deposit');
    }
  };

  return {
    deposits: query.data || [],
    isLoading: query.isLoading,
    addDeposit,
    updateDeposit,
    deleteDeposit,
  };
}
