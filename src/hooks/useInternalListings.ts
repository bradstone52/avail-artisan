import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrg } from './useOrg';
import { toast } from 'sonner';

export interface InternalListing {
  id: string;
  listing_number: string | null;
  org_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  address: string;
  display_address: string | null;
  city: string;
  submarket: string;
  property_type: string | null;
  zoning: string | null;
  size_sf: number | null;
  warehouse_sf: number | null;
  office_sf: number | null;
  clear_height_ft: number | null;
  power: string | null;
  yard: string | null;
  loading_type: string | null;
  dock_doors: number | null;
  drive_in_doors: number | null;
  land_acres: number | null;
  latitude: number | null;
  longitude: number | null;
  deal_type: string;
  asking_rent_psf: number | null;
  asking_sale_price: number | null;
  op_costs: number | null;
  taxes: number | null;
  cam: number | null;
  status: string;
  assigned_agent_id: string | null;
  secondary_agent_id: string | null;
  owner_id: string | null;
  owner_name: string | null;
  owner_contact: string | null;
  description: string | null;
  broker_remarks: string | null;
  confidential_summary: string | null;
  published_at: string | null;
  archived_at: string | null;
  archived_reason: string | null;
  photo_url: string | null;
  // Joined data
  assigned_agent?: { id: string; name: string } | null;
  secondary_agent?: { id: string; name: string } | null;
}

export interface InternalListingFormData {
  listing_number?: string;
  address: string;
  display_address?: string;
  city: string;
  submarket: string;
  property_type?: string;
  zoning?: string;
  size_sf?: number;
  warehouse_sf?: number;
  office_sf?: number;
  clear_height_ft?: number;
  power?: string;
  yard?: string;
  loading_type?: string;
  dock_doors?: number;
  drive_in_doors?: number;
  land_acres?: number;
  deal_type: string;
  asking_rent_psf?: number;
  asking_sale_price?: number;
  op_costs?: number;
  taxes?: number;
  cam?: number;
  status: string;
  assigned_agent_id?: string;
  secondary_agent_id?: string;
  owner_name?: string;
  owner_contact?: string;
  description?: string;
  broker_remarks?: string;
  confidential_summary?: string;
  photo_url?: string;
}

export interface InternalListingStatusHistory {
  id: string;
  listing_id: string;
  previous_status: string | null;
  new_status: string;
  changed_by: string;
  changed_at: string;
  notes: string | null;
}

export const INTERNAL_LISTING_STATUSES = [
  'Active',
  'Pending',
  'Leased',
  'Sold',
  'Expired',
  'Archived',
] as const;

export const PROPERTY_TYPES = [
  'Industrial',
  'Retail',
  'Office',
  'Land',
  'Mixed-Use',
] as const;

export const DEAL_TYPES = ['Lease', 'Sale', 'Both'] as const;

export const LOADING_TYPES = ['Dock', 'Drive-In', 'Both'] as const;

export function useInternalListings() {
  const { orgId } = useOrg();
  const queryClient = useQueryClient();

  const listingsQuery = useQuery({
    queryKey: ['internal-listings', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('internal_listings')
        .select(`
          *,
          assigned_agent:agents!internal_listings_assigned_agent_id_fkey(id, name),
          secondary_agent:agents!internal_listings_secondary_agent_id_fkey(id, name)
        `)
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as InternalListing[];
    },
    enabled: !!orgId,
  });

  const createListing = useMutation({
    mutationFn: async (formData: InternalListingFormData) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('internal_listings')
        .insert({
          ...formData,
          org_id: orgId,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-listings'] });
      toast.success('Listing created successfully');
    },
    onError: (error) => {
      console.error('Error creating listing:', error);
      toast.error('Failed to create listing');
    },
  });

  const updateListing = useMutation({
    mutationFn: async ({ id, ...formData }: InternalListingFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('internal_listings')
        .update(formData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-listings'] });
      toast.success('Listing updated successfully');
    },
    onError: (error) => {
      console.error('Error updating listing:', error);
      toast.error('Failed to update listing');
    },
  });

  const deleteListing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('internal_listings')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-listings'] });
      toast.success('Listing deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting listing:', error);
      toast.error('Failed to delete listing');
    },
  });

  return {
    listings: listingsQuery.data ?? [],
    isLoading: listingsQuery.isLoading,
    error: listingsQuery.error,
    createListing,
    updateListing,
    deleteListing,
    refetch: listingsQuery.refetch,
  };
}

export function useInternalListing(id: string | undefined) {
  return useQuery({
    queryKey: ['internal-listing', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('internal_listings')
        .select(`
          *,
          assigned_agent:agents!internal_listings_assigned_agent_id_fkey(id, name),
          secondary_agent:agents!internal_listings_secondary_agent_id_fkey(id, name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as InternalListing;
    },
    enabled: !!id,
  });
}

export function useInternalListingStatusHistory(listingId: string | undefined) {
  return useQuery({
    queryKey: ['internal-listing-status-history', listingId],
    queryFn: async () => {
      if (!listingId) return [];

      const { data, error } = await supabase
        .from('internal_listing_status_history')
        .select('*')
        .eq('listing_id', listingId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      return data as InternalListingStatusHistory[];
    },
    enabled: !!listingId,
  });
}
