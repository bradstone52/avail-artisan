import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';
import { toast } from 'sonner';
import type { ProspectTask, ProspectTaskFormData } from '@/types/prospect';

export function useProspectTasks(prospectId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['prospect_tasks', prospectId],
    queryFn: async () => {
      if (!prospectId) return [];

      const { data, error } = await (supabase as any)
        .from('prospect_tasks')
        .select('*')
        .eq('prospect_id', prospectId)
        .order('completed', { ascending: true })
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ProspectTask[];
    },
    enabled: !!user && !!prospectId,
  });
}

/** Fetch all incomplete tasks for an org's prospects in one query */
export function useAllProspectTasks(prospectIds: string[]) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['prospect_tasks_all', prospectIds.join(',')],
    queryFn: async () => {
      if (!prospectIds.length) return [] as ProspectTask[];

      const { data, error } = await (supabase as any)
        .from('prospect_tasks')
        .select('*')
        .in('prospect_id', prospectIds)
        .eq('completed', false)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as ProspectTask[];
    },
    enabled: !!user && prospectIds.length > 0,
  });
}

export function useCreateProspectTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { org } = useOrg();

  return useMutation({
    mutationFn: async ({
      prospectId,
      formData,
    }: {
      prospectId: string;
      formData: ProspectTaskFormData;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await (supabase as any)
        .from('prospect_tasks')
        .insert({
          prospect_id: prospectId,
          org_id: org?.id ?? null,
          created_by: user.id,
          title: formData.title,
          notes: formData.notes || null,
          due_date: formData.due_date || null,
          reminder_at: formData.reminder_at || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ProspectTask;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prospect_tasks', data.prospect_id] });
      toast.success('Task added');
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      toast.error('Failed to add task');
    },
  });
}

export function useUpdateProspectTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      prospectId,
      ...updates
    }: Partial<ProspectTask> & { id: string; prospectId: string }) => {
      const { data, error } = await (supabase as any)
        .from('prospect_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ProspectTask;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prospect_tasks', data.prospect_id] });
    },
    onError: (error) => {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    },
  });
}

export function useToggleProspectTaskCompleted() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, prospectId, completed }: { id: string; prospectId: string; completed: boolean }) => {
      const { data, error } = await (supabase as any)
        .from('prospect_tasks')
        .update({ completed })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ProspectTask;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prospect_tasks', data.prospect_id] });
    },
    onError: (error) => {
      console.error('Error toggling task:', error);
      toast.error('Failed to update task');
    },
  });
}

export function useDeleteProspectTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, prospectId }: { id: string; prospectId: string }) => {
      const { error } = await (supabase as any)
        .from('prospect_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, prospectId };
    },
    onSuccess: ({ prospectId }) => {
      queryClient.invalidateQueries({ queryKey: ['prospect_tasks', prospectId] });
      toast.success('Task deleted');
    },
    onError: (error) => {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    },
  });
}
