import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Deal } from '@/types/database';

export function useLinkedDeal(listingId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['linked-deal', listingId],
    queryFn: async () => {
      if (!listingId) return null;

      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('internal_listing_id', listingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as Deal | null;
    },
    enabled: !!user && !!listingId,
  });
}

/** Partial update — only touches internal_listing_id; no other fields overwritten. */
export function useLinkDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dealId,
      listingId,
    }: {
      dealId: string;
      listingId: string | null;
    }) => {
      const { error } = await supabase
        .from('deals')
        .update({ internal_listing_id: listingId })
        .eq('id', dealId);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      // Invalidate the linked-deal query for the affected listing (both old and new)
      queryClient.invalidateQueries({ queryKey: ['linked-deal'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}
