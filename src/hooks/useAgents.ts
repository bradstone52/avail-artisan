import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';
import { toast } from 'sonner';
import type { Agent, AgentFormData } from '@/types/database';

export function useAgents() {
  const { user } = useAuth();
  const { org } = useOrg();

  return useQuery({
    queryKey: ['agents', org?.id],
    queryFn: async () => {
      if (!org?.id) return [];
      
      const { data, error } = await supabase
        .from('agents')
        .select(`
          *,
          brokerage:brokerages(*)
        `)
        .eq('org_id', org.id)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Agent[];
    },
    enabled: !!user && !!org?.id,
  });
}

export function useAgent(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['agents', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('agents')
        .select(`
          *,
          brokerage:brokerages(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Agent | null;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { org } = useOrg();

  return useMutation({
    mutationFn: async (formData: AgentFormData) => {
      if (!user?.id || !org?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('agents')
        .insert({
          ...formData,
          user_id: user.id,
          org_id: org.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Agent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Agent created successfully');
    },
    onError: (error) => {
      console.error('Error creating agent:', error);
      toast.error('Failed to create agent');
    },
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...formData }: AgentFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('agents')
        .update(formData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Agent;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agents', data.id] });
      toast.success('Agent updated successfully');
    },
    onError: (error) => {
      console.error('Error updating agent:', error);
      toast.error('Failed to update agent');
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Agent deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting agent:', error);
      toast.error('Failed to delete agent');
    },
  });
}
