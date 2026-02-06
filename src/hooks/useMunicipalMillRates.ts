import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrg } from './useOrg';
import { toast } from 'sonner';

export interface MunicipalMillRate {
  id: string;
  municipality: string;
  mill_rate: number;
  rate_year: number;
  org_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useMunicipalMillRates() {
  const { orgId } = useOrg();

  return useQuery({
    queryKey: ['municipal-mill-rates', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      
      const { data, error } = await supabase
        .from('municipal_mill_rates')
        .select('*')
        .eq('org_id', orgId)
        .order('municipality');

      if (error) throw error;
      return data as MunicipalMillRate[];
    },
    enabled: !!orgId,
  });
}

export function useMunicipalMillRate(municipality: string | null | undefined) {
  const { orgId } = useOrg();

  return useQuery({
    queryKey: ['municipal-mill-rate', orgId, municipality],
    queryFn: async () => {
      if (!orgId || !municipality) return null;
      
      // Normalize municipality name for lookup
      const normalizedName = municipality.trim().toUpperCase();
      
      const { data, error } = await supabase
        .from('municipal_mill_rates')
        .select('*')
        .eq('org_id', orgId)
        .ilike('municipality', normalizedName)
        .maybeSingle();

      if (error) throw error;
      return data as MunicipalMillRate | null;
    },
    enabled: !!orgId && !!municipality,
  });
}

export function useUpsertMunicipalMillRate() {
  const queryClient = useQueryClient();
  const { orgId } = useOrg();

  return useMutation({
    mutationFn: async ({ 
      municipality, 
      millRate, 
      rateYear 
    }: { 
      municipality: string; 
      millRate: number; 
      rateYear: number;
    }) => {
      if (!orgId) throw new Error('No organization');
      
      // Normalize municipality name
      const normalizedName = municipality.trim().toUpperCase();
      
      // Check if record exists
      const { data: existing } = await supabase
        .from('municipal_mill_rates')
        .select('id')
        .eq('org_id', orgId)
        .ilike('municipality', normalizedName)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('municipal_mill_rates')
          .update({
            mill_rate: millRate,
            rate_year: rateYear,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('municipal_mill_rates')
          .insert({
            municipality: normalizedName,
            mill_rate: millRate,
            rate_year: rateYear,
            org_id: orgId,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['municipal-mill-rates'] });
      queryClient.invalidateQueries({ queryKey: ['municipal-mill-rate'] });
      toast.success('Mill rate saved');
    },
    onError: (error) => {
      console.error('Error saving mill rate:', error);
      toast.error('Failed to save mill rate');
    },
  });
}
