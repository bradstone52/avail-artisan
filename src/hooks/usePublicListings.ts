import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PublicListing {
  id: string;
  listing_number: string | null;
  address: string;
  display_address: string | null;
  city: string;
  submarket: string;
  property_type: string | null;
  zoning: string | null;
  size_sf: number | null;
  warehouse_sf: number | null;
  office_sf: number | null;
  second_floor_office_sf: number | null;
  clear_height_ft: number | null;
  power: string | null;
  yard: string | null;
  loading_type: string | null;
  dock_doors: number | null;
  drive_in_doors: number | null;
  drive_in_door_dimensions: string[] | null;
  land_acres: number | null;
  deal_type: string;
  asking_rent_psf: number | null;
  asking_sale_price: number | null;
  op_costs: number | null;
  taxes: number | null;
  cam: number | null;
  gross_rate: number | null;
  status: string;
  description: string | null;
  photo_url: string | null;
  brochure_link: string | null;
  website_link: string | null;
  has_land: boolean | null;
  additional_features: string | null;
  has_mua: boolean | null;
  has_sprinklers: boolean | null;
  sprinklers_esfr: boolean | null;
  has_led_lighting: boolean | null;
  has_rail_access: boolean | null;
  has_air_conditioning: boolean | null;
  published_at: string | null;
  assigned_agent_id: string | null;
  secondary_agent_id: string | null;
  assigned_agent?: { id: string; name: string; email: string | null; phone: string | null } | null;
  secondary_agent?: { id: string; name: string; email: string | null; phone: string | null } | null;
}

export interface PublicListingFilters {
  search: string;
  propertyType: string;
  dealType: string;
  city: string;
  minSize?: number;
  maxSize?: number;
}

export function usePublicListings() {
  return useQuery({
    queryKey: ['public-listings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('internal_listings')
        .select(`
          id,
          listing_number,
          address,
          display_address,
          city,
          submarket,
          property_type,
          zoning,
          size_sf,
          warehouse_sf,
          office_sf,
          second_floor_office_sf,
          clear_height_ft,
          power,
          yard,
          loading_type,
          dock_doors,
          drive_in_doors,
          drive_in_door_dimensions,
          land_acres,
          deal_type,
          asking_rent_psf,
          asking_sale_price,
          op_costs,
          taxes,
          cam,
          gross_rate,
          status,
          description,
          photo_url,
          brochure_link,
          website_link,
          has_land,
          additional_features,
          has_mua,
          has_sprinklers,
          sprinklers_esfr,
          has_led_lighting,
          has_rail_access,
          has_air_conditioning,
          published_at,
          assigned_agent_id,
          secondary_agent_id,
          assigned_agent:agents!internal_listings_assigned_agent_id_fkey(id, name, email, phone),
          secondary_agent:agents!internal_listings_secondary_agent_id_fkey(id, name, email, phone)
        `)
        .eq('website_published', true)
        .eq('status', 'Active')
        .order('published_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return (data ?? []) as PublicListing[];
    },
  });
}

export function usePublicListing(id: string | undefined) {
  return useQuery({
    queryKey: ['public-listing', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('internal_listings')
        .select(`
          id,
          listing_number,
          address,
          display_address,
          city,
          submarket,
          property_type,
          zoning,
          size_sf,
          warehouse_sf,
          office_sf,
          second_floor_office_sf,
          clear_height_ft,
          power,
          yard,
          loading_type,
          dock_doors,
          drive_in_doors,
          drive_in_door_dimensions,
          land_acres,
          deal_type,
          asking_rent_psf,
          asking_sale_price,
          op_costs,
          taxes,
          cam,
          gross_rate,
          status,
          description,
          photo_url,
          brochure_link,
          website_link,
          has_land,
          additional_features,
          has_mua,
          has_sprinklers,
          sprinklers_esfr,
          has_led_lighting,
          has_rail_access,
          has_air_conditioning,
          published_at,
          assigned_agent_id,
          secondary_agent_id,
          assigned_agent:agents!internal_listings_assigned_agent_id_fkey(id, name, email, phone),
          secondary_agent:agents!internal_listings_secondary_agent_id_fkey(id, name, email, phone)
        `)
        .eq('id', id)
        .eq('website_published', true)
        .eq('status', 'Active')
        .single();

      if (error) throw error;
      return data as PublicListing;
    },
    enabled: !!id,
  });
}

export function usePublicListingPhotos(listingId: string | undefined) {
  return useQuery({
    queryKey: ['public-listing-photos', listingId],
    queryFn: async () => {
      if (!listingId) return [];
      const { data, error } = await supabase
        .from('internal_listing_photos')
        .select('id, photo_url, caption, sort_order')
        .eq('listing_id', listingId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!listingId,
  });
}
