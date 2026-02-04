import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';
import { toast } from 'sonner';

export interface InternalListingTour {
  id: string;
  listing_id: string;
  org_id: string | null;
  tour_date: string;
  touring_party_name: string | null;
  touring_party_company: string | null;
  touring_party_phone: string | null;
  touring_party_email: string | null;
  touring_agent_id: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  // Joined data
  touring_agent?: {
    id: string;
    name: string;
    brokerage?: { id: string; name: string } | null;
  } | null;
}

export interface TourFormData {
  tour_date: string;
  touring_party_name?: string;
  touring_party_company?: string;
  touring_party_phone?: string;
  touring_party_email?: string;
  touring_agent_id?: string;
  notes?: string;
}

export function useInternalListingTours(listingId: string | undefined) {
  const { user } = useAuth();
  const { orgId } = useOrg();
  const queryClient = useQueryClient();

  const toursQuery = useQuery({
    queryKey: ['internal_listing_tours', listingId],
    queryFn: async () => {
      if (!listingId) return [];

      const { data, error } = await supabase
        .from('internal_listing_tours')
        .select(`
          *,
          touring_agent:agents!internal_listing_tours_touring_agent_id_fkey(
            id,
            name,
            brokerage:brokerages(id, name)
          )
        `)
        .eq('listing_id', listingId)
        .order('tour_date', { ascending: false });

      if (error) throw error;
      return data as InternalListingTour[];
    },
    enabled: !!user && !!listingId,
  });

  const createTour = useMutation({
    mutationFn: async (data: TourFormData & { listing_id: string }) => {
      if (!user?.id || !orgId) throw new Error('Not authenticated');

      const { data: result, error } = await supabase
        .from('internal_listing_tours')
        .insert({
          ...data,
          org_id: orgId,
          created_by: user.id,
          touring_agent_id: data.touring_agent_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal_listing_tours', listingId] });
      toast.success('Tour logged');
    },
    onError: (error) => {
      console.error('Error creating tour:', error);
      toast.error('Failed to log tour');
    },
  });

  const updateTour = useMutation({
    mutationFn: async ({ id, ...data }: TourFormData & { id: string }) => {
      const { data: result, error } = await supabase
        .from('internal_listing_tours')
        .update({
          ...data,
          touring_agent_id: data.touring_agent_id || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal_listing_tours', listingId] });
      toast.success('Tour updated');
    },
    onError: (error) => {
      console.error('Error updating tour:', error);
      toast.error('Failed to update tour');
    },
  });

  const deleteTour = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('internal_listing_tours')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal_listing_tours', listingId] });
      toast.success('Tour deleted');
    },
    onError: (error) => {
      console.error('Error deleting tour:', error);
      toast.error('Failed to delete tour');
    },
  });

  return {
    tours: toursQuery.data ?? [],
    isLoading: toursQuery.isLoading,
    createTour,
    updateTour,
    deleteTour,
  };
}
