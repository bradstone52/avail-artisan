import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';
import { toast } from 'sonner';
import type { Brokerage, BrokerageFormData } from '@/types/database';

export function useBrokerages() {
  const { user } = useAuth();
  const { org } = useOrg();

  return useQuery({
    queryKey: ['brokerages', org?.id],
    queryFn: async () => {
      if (!org?.id) return [];
      
      const { data, error } = await supabase
        .from('brokerages')
        .select('*')
        .eq('org_id', org.id)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Brokerage[];
    },
    enabled: !!user && !!org?.id,
  });
}

export function useBrokerage(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['brokerages', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('brokerages')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Brokerage | null;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateBrokerage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { org } = useOrg();

  return useMutation({
    mutationFn: async (formData: BrokerageFormData) => {
      if (!user?.id || !org?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('brokerages')
        .insert({
          ...formData,
          user_id: user.id,
          org_id: org.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Brokerage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokerages'] });
      toast.success('Brokerage created successfully');
    },
    onError: (error) => {
      console.error('Error creating brokerage:', error);
      toast.error('Failed to create brokerage');
    },
  });
}

export function useUpdateBrokerage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...formData }: BrokerageFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('brokerages')
        .update(formData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Brokerage;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['brokerages'] });
      queryClient.invalidateQueries({ queryKey: ['brokerages', data.id] });
      toast.success('Brokerage updated successfully');
    },
    onError: (error) => {
      console.error('Error updating brokerage:', error);
      toast.error('Failed to update brokerage');
    },
  });
}

export function useDeleteBrokerage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('brokerages')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokerages'] });
      toast.success('Brokerage deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting brokerage:', error);
      toast.error('Failed to delete brokerage');
    },
  });
}
