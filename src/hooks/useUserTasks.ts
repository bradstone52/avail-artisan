import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';
import { toast } from 'sonner';
import type { UserTask, UserTaskFormData } from '@/types/tasks';

export function useUserTasks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user_tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('user_tasks')
        .select('*')
        .order('completed', { ascending: true })
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UserTask[];
    },
    enabled: !!user,
  });
}

export function useCreateUserTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { org } = useOrg();

  return useMutation({
    mutationFn: async (formData: UserTaskFormData) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await (supabase as any)
        .from('user_tasks')
        .insert({
          user_id: user.id,
          org_id: org?.id ?? null,
          title: formData.title,
          notes: formData.notes || null,
          due_date: formData.due_date || null,
          reminder_at: formData.reminder_at ? new Date(formData.reminder_at).toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as UserTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_tasks'] });
      toast.success('Task added');
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      toast.error('Failed to add task');
    },
  });
}

export function useUpdateUserTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<UserTask> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('user_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as UserTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_tasks'] });
    },
    onError: (error) => {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    },
  });
}

export function useToggleUserTaskCompleted() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { data, error } = await (supabase as any)
        .from('user_tasks')
        .update({ completed })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as UserTask;
    },
    onMutate: async ({ id, completed }) => {
      const key = ['user_tasks', user?.id];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<UserTask[]>(key);
      queryClient.setQueryData<UserTask[]>(key, (old) =>
        old?.map((t) => (t.id === id ? { ...t, completed } : t)) ?? []
      );
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_tasks'] });
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['user_tasks', user?.id], context.previous);
      toast.error('Failed to update task');
    },
  });
}

export function useDeleteUserTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('user_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async (id) => {
      const key = ['user_tasks', user?.id];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<UserTask[]>(key);
      queryClient.setQueryData<UserTask[]>(key, (old) =>
        old?.filter((t) => t.id !== id) ?? []
      );
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_tasks'] });
      toast.success('Task deleted');
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['user_tasks', user?.id], context.previous);
      toast.error('Failed to delete task');
    },
  });
}

export function useSetUserTaskReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reminderAt }: { id: string; reminderAt: string | null }) => {
      const { data, error } = await (supabase as any)
        .from('user_tasks')
        .update({ reminder_at: reminderAt, reminder_sent: false })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as UserTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_tasks'] });
      toast.success('Reminder set');
    },
    onError: () => {
      toast.error('Failed to set reminder');
    },
  });
}
