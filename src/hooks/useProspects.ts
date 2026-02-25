import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';
import { toast } from 'sonner';
import type { Prospect, ProspectFormData } from '@/types/prospect';

export function useProspects() {
  const { user } = useAuth();
  const { org } = useOrg();

  return useQuery({
    queryKey: ['prospects', org?.id],
    queryFn: async () => {
      if (!org?.id) return [];
      
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .eq('org_id', org.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Prospect[];
    },
    enabled: !!user && !!org?.id,
  });
}

export function useProspect(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['prospects', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Prospect | null;
    },
    enabled: !!user && !!id,
  });
}

// Helper to convert empty strings to null for date fields
function sanitizeProspectData(formData: ProspectFormData) {
  return {
    ...formData,
    follow_up_date: formData.follow_up_date || null,
    occupancy_date: formData.occupancy_date || null,
    priority: formData.priority || null,
    email: formData.email || null,
    phone: formData.phone || null,
  };
}

export function useCreateProspect() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { org } = useOrg();

  return useMutation({
    mutationFn: async (formData: ProspectFormData) => {
      if (!user?.id || !org?.id) throw new Error('Not authenticated');

      const sanitized = sanitizeProspectData(formData);

      const { data, error } = await (supabase as any)
        .from('prospects')
        .insert({
          ...sanitized,
          user_id: user.id,
          org_id: org.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Prospect;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      toast.success('Prospect created successfully');
    },
    onError: (error) => {
      console.error('Error creating prospect:', error);
      toast.error('Failed to create prospect');
    },
  });
}

export function useUpdateProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...formData }: ProspectFormData & { id: string }) => {
      const sanitized = sanitizeProspectData(formData);

      const { data, error } = await (supabase as any)
        .from('prospects')
        .update(sanitized)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Prospect;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      queryClient.invalidateQueries({ queryKey: ['prospects', data.id] });
      toast.success('Prospect updated successfully');
    },
    onError: (error) => {
      console.error('Error updating prospect:', error);
      toast.error('Failed to update prospect');
    },
  });
}

export function useDeleteProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('prospects')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      toast.success('Prospect deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting prospect:', error);
      toast.error('Failed to delete prospect');
    },
  });
}

export function useLogProspectContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase as any)
        .from('prospects')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      queryClient.invalidateQueries({ queryKey: ['prospects', data.id] });
      toast.success('Contact logged');
    },
    onError: (error) => {
      console.error('Error logging contact:', error);
      toast.error('Failed to log contact');
    },
  });
}

export function useSetProspectContactDate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, date }: { id: string; date: Date }) => {
      const { data, error } = await (supabase as any)
        .from('prospects')
        .update({ last_contacted_at: date.toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      queryClient.invalidateQueries({ queryKey: ['prospects', data.id] });
      toast.success('Contact date updated');
    },
    onError: (error) => {
      console.error('Error updating contact date:', error);
      toast.error('Failed to update contact date');
    },
  });
}
