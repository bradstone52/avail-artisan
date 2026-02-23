import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';
import { toast } from 'sonner';
import type { Deal, DealFormData } from '@/types/database';
import { addDays, isAfter, isBefore } from 'date-fns';

export function useDeals() {
  const { user } = useAuth();
  const { org } = useOrg();

  return useQuery({
    queryKey: ['deals', org?.id],
    queryFn: async () => {
      if (!org?.id) return [];
      
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('org_id', org.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Deal[];
    },
    enabled: !!user && !!org?.id,
  });
}

export function useDeal(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['deals', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Deal | null;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { org } = useOrg();

  return useMutation({
    mutationFn: async (formData: DealFormData) => {
      if (!user?.id || !org?.id) throw new Error('Not authenticated');

      // Convert empty date strings to null
      const sanitizedData = {
        ...formData,
        close_date: formData.close_date || null,
        commencement_date: formData.commencement_date || null,
        expiry_date: formData.expiry_date || null,
        lease_rate_psf: formData.lease_rate_psf ?? null,
        lease_term_months: formData.lease_term_months ?? null,
        user_id: user.id,
        org_id: org.id,
      };

      const { data, error } = await supabase
        .from('deals')
        .insert(sanitizedData)
        .select()
        .single();

      if (error) throw error;
      return data as Deal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast.success('Deal created successfully');
    },
    onError: (error) => {
      console.error('Error creating deal:', error);
      toast.error('Failed to create deal');
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...formData }: DealFormData & { id: string }) => {
      // Convert empty date strings to null
      const sanitizedData = {
        ...formData,
        close_date: formData.close_date || null,
        commencement_date: formData.commencement_date || null,
        expiry_date: formData.expiry_date || null,
        lease_rate_psf: formData.lease_rate_psf ?? null,
        lease_term_months: formData.lease_term_months ?? null,
      };

      const { data, error } = await supabase
        .from('deals')
        .update(sanitizedData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Deal;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals', data.id] });
      toast.success('Deal updated successfully');

      // Auto-create tenant when a lease deal is closed
      if (
        data.status === 'Closed' &&
        ['Lease', 'Sublease', 'Renewal'].includes(data.deal_type) &&
        data.buyer_name &&
        data.property_id &&
        user?.id
      ) {
        try {
          // Check for existing tenant with same name on same property
          const { data: existing } = await supabase
            .from('property_tenants')
            .select('id')
            .eq('property_id', data.property_id)
            .eq('tenant_name', data.buyer_name)
            .maybeSingle();

          if (!existing) {
            await supabase.from('property_tenants').insert({
              property_id: data.property_id,
              tenant_name: data.buyer_name,
              size_sf: data.size_sf ? Math.round(Number(data.size_sf)) : null,
              lease_expiry: data.expiry_date || null,
              tracked_by: user.id,
            });
            queryClient.invalidateQueries({ queryKey: ['all-tenants'] });
          }
        } catch (err) {
          console.error('Auto-create tenant failed:', err);
        }
      }
    },
    onError: (error) => {
      console.error('Error updating deal:', error);
      toast.error('Failed to update deal');
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast.success('Deal deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting deal:', error);
      toast.error('Failed to delete deal');
    },
  });
}

export function useDealsClosingInNext30Days() {
  const { data: deals } = useDeals();

  const today = new Date();
  const thirtyDaysFromNow = addDays(today, 30);

  return deals?.filter(deal => {
    if (!deal.close_date || deal.status === 'Closed' || deal.status === 'Lost') return false;
    const closeDate = new Date(deal.close_date);
    return isAfter(closeDate, today) && isBefore(closeDate, thirtyDaysFromNow);
  }) || [];
}
