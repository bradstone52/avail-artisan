import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';
import { toast } from 'sonner';

export interface InternalListingInquiry {
  id: string;
  listing_id: string;
  org_id: string | null;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  contact_company: string | null;
  source: string;
  stage: string;
  assigned_broker_id: string | null;
  notes: string | null;
  next_follow_up: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined data
  assigned_broker?: { id: string; name: string } | null;
}

export interface InquiryTimelineEvent {
  id: string;
  inquiry_id: string;
  org_id: string | null;
  event_type: string;
  notes: string | null;
  event_date: string;
  created_at: string;
  created_by: string | null;
}

export interface InquiryFormData {
  contact_name: string;
  contact_email?: string;
  contact_phone?: string;
  contact_company?: string;
  source: string;
  stage: string;
  assigned_broker_id?: string;
  notes?: string;
  next_follow_up?: string;
}

export interface TimelineEventFormData {
  event_type: string;
  notes?: string;
  event_date?: string;
}

export const INQUIRY_SOURCES = [
  'Direct',
  'Website',
  'Signage',
  'Email Blast',
  'LoopNet',
  'CoStar',
  'Referral',
  'Cold Call',
  'Trade Show',
  'Other',
] as const;

export const INQUIRY_STAGES = [
  'New',
  'Contacted',
  'Tour Booked',
  'Tour Completed',
  'Offer Sent',
  'LOI Pending',
  'Completed',
  'Lost',
] as const;

export const TIMELINE_EVENT_TYPES = [
  'Call',
  'Email',
  'Tour',
  'Meeting',
  'Offer',
  'LOI',
  'Note',
  'Other',
] as const;

export function useInternalListingInquiries(listingId: string | undefined) {
  const { user } = useAuth();
  const { orgId } = useOrg();
  const queryClient = useQueryClient();

  const inquiriesQuery = useQuery({
    queryKey: ['internal_listing_inquiries', listingId],
    queryFn: async () => {
      if (!listingId) return [];

      const { data, error } = await supabase
        .from('internal_listing_inquiries')
        .select(`
          *,
          assigned_broker:agents!internal_listing_inquiries_assigned_broker_id_fkey(id, name)
        `)
        .eq('listing_id', listingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as InternalListingInquiry[];
    },
    enabled: !!user && !!listingId,
  });

  const createInquiry = useMutation({
    mutationFn: async (data: InquiryFormData & { listing_id: string }) => {
      if (!user?.id || !orgId) throw new Error('Not authenticated');

      const { data: result, error } = await supabase
        .from('internal_listing_inquiries')
        .insert({
          ...data,
          org_id: orgId,
          created_by: user.id,
          next_follow_up: data.next_follow_up || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal_listing_inquiries', listingId] });
      toast.success('Inquiry created');
    },
    onError: (error) => {
      console.error('Error creating inquiry:', error);
      toast.error('Failed to create inquiry');
    },
  });

  const updateInquiry = useMutation({
    mutationFn: async ({ id, ...data }: InquiryFormData & { id: string }) => {
      const { data: result, error } = await supabase
        .from('internal_listing_inquiries')
        .update({
          ...data,
          next_follow_up: data.next_follow_up || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal_listing_inquiries', listingId] });
      toast.success('Inquiry updated');
    },
    onError: (error) => {
      console.error('Error updating inquiry:', error);
      toast.error('Failed to update inquiry');
    },
  });

  const deleteInquiry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('internal_listing_inquiries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal_listing_inquiries', listingId] });
      toast.success('Inquiry deleted');
    },
    onError: (error) => {
      console.error('Error deleting inquiry:', error);
      toast.error('Failed to delete inquiry');
    },
  });

  const updateStage = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase
        .from('internal_listing_inquiries')
        .update({ stage })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal_listing_inquiries', listingId] });
      toast.success('Stage updated');
    },
    onError: (error) => {
      console.error('Error updating stage:', error);
      toast.error('Failed to update stage');
    },
  });

  return {
    inquiries: inquiriesQuery.data ?? [],
    isLoading: inquiriesQuery.isLoading,
    createInquiry,
    updateInquiry,
    deleteInquiry,
    updateStage,
  };
}

export function useInquiryTimeline(inquiryId: string | undefined) {
  const { user } = useAuth();
  const { orgId } = useOrg();
  const queryClient = useQueryClient();

  const timelineQuery = useQuery({
    queryKey: ['inquiry_timeline', inquiryId],
    queryFn: async () => {
      if (!inquiryId) return [];

      const { data, error } = await supabase
        .from('internal_listing_inquiry_timeline')
        .select('*')
        .eq('inquiry_id', inquiryId)
        .order('event_date', { ascending: false });

      if (error) throw error;
      return data as InquiryTimelineEvent[];
    },
    enabled: !!user && !!inquiryId,
  });

  const addEvent = useMutation({
    mutationFn: async (data: TimelineEventFormData & { inquiry_id: string }) => {
      if (!user?.id || !orgId) throw new Error('Not authenticated');

      const { data: result, error } = await supabase
        .from('internal_listing_inquiry_timeline')
        .insert({
          ...data,
          org_id: orgId,
          created_by: user.id,
          event_date: data.event_date || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiry_timeline', inquiryId] });
      toast.success('Event added');
    },
    onError: (error) => {
      console.error('Error adding event:', error);
      toast.error('Failed to add event');
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('internal_listing_inquiry_timeline')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiry_timeline', inquiryId] });
      toast.success('Event deleted');
    },
    onError: (error) => {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    },
  });

  return {
    events: timelineQuery.data ?? [],
    isLoading: timelineQuery.isLoading,
    addEvent,
    deleteEvent,
  };
}
