import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * After any change to prospect_follow_up_dates, sync the parent
 * prospects.follow_up_date with the earliest non-completed upcoming date
 * (or the most recent past date if none are upcoming).
 */
async function syncProspectFollowUpDate(prospectId: string) {
  // Fetch all non-completed follow-up dates for this prospect, ordered by date
  const { data: dates } = await supabase
    .from('prospect_follow_up_dates')
    .select('date')
    .eq('prospect_id', prospectId)
    .eq('completed', false)
    .order('date', { ascending: true });

  const nextDate = dates && dates.length > 0 ? dates[0].date : null;

  await supabase
    .from('prospects')
    .update({ follow_up_date: nextDate })
    .eq('id', prospectId);
}

export interface ProspectFollowUpDate {
  id: string;
  prospect_id: string;
  date: string;
  notes: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface FollowUpDateFormData {
  date: string;
  notes?: string;
  completed?: boolean;
}

export function useProspectFollowUpDates(prospectId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['prospect-follow-up-dates', prospectId],
    queryFn: async () => {
      if (!prospectId) return [];
      
      const { data, error } = await supabase
        .from('prospect_follow_up_dates')
        .select('*')
        .eq('prospect_id', prospectId)
        .order('date', { ascending: true });

      if (error) throw error;
      return data as ProspectFollowUpDate[];
    },
    enabled: !!user && !!prospectId,
  });
}

export function useCreateFollowUpDate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ prospectId, ...formData }: FollowUpDateFormData & { prospectId: string }) => {
      const { data, error } = await supabase
        .from('prospect_follow_up_dates')
        .insert({
          prospect_id: prospectId,
          date: formData.date,
          notes: formData.notes || null,
          completed: formData.completed || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ProspectFollowUpDate;
    },
    onSuccess: async (data) => {
      await syncProspectFollowUpDate(data.prospect_id);
      queryClient.invalidateQueries({ queryKey: ['prospect-follow-up-dates', data.prospect_id] });
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      toast.success('Follow-up date added');
    },
    onError: (error) => {
      console.error('Error creating follow-up date:', error);
      toast.error('Failed to add follow-up date');
    },
  });
}

export function useUpdateFollowUpDate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, prospectId, ...formData }: FollowUpDateFormData & { id: string; prospectId: string }) => {
      const { data, error } = await supabase
        .from('prospect_follow_up_dates')
        .update({
          date: formData.date,
          notes: formData.notes || null,
          completed: formData.completed,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, prospectId } as ProspectFollowUpDate & { prospectId: string };
    },
    onSuccess: async (data) => {
      await syncProspectFollowUpDate(data.prospectId);
      queryClient.invalidateQueries({ queryKey: ['prospect-follow-up-dates', data.prospectId] });
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      toast.success('Follow-up date updated');
    },
    onError: (error) => {
      console.error('Error updating follow-up date:', error);
      toast.error('Failed to update follow-up date');
    },
  });
}

export function useDeleteFollowUpDate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, prospectId }: { id: string; prospectId: string }) => {
      const { error } = await supabase
        .from('prospect_follow_up_dates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { prospectId };
    },
    onSuccess: async (data) => {
      await syncProspectFollowUpDate(data.prospectId);
      queryClient.invalidateQueries({ queryKey: ['prospect-follow-up-dates', data.prospectId] });
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      toast.success('Follow-up date removed');
    },
    onError: (error) => {
      console.error('Error deleting follow-up date:', error);
      toast.error('Failed to remove follow-up date');
    },
  });
}

export function useToggleFollowUpDateCompleted() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, prospectId, completed }: { id: string; prospectId: string; completed: boolean }) => {
      const { data, error } = await supabase
        .from('prospect_follow_up_dates')
        .update({ completed })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, prospectId } as ProspectFollowUpDate & { prospectId: string };
    },
    onSuccess: async (data) => {
      await syncProspectFollowUpDate(data.prospectId);
      queryClient.invalidateQueries({ queryKey: ['prospect-follow-up-dates', data.prospectId] });
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
    },
    onError: (error) => {
      console.error('Error toggling follow-up date:', error);
      toast.error('Failed to update follow-up date');
    },
  });
}
