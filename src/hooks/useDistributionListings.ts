import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';
import { Listing } from '@/lib/types';

/**
 * Hook to fetch distribution listings from market_listings table.
 * Filters for Active status and is_distribution_warehouse = true.
 */
export function useDistributionListings() {
  const { user } = useAuth();
  const { orgId, loading: orgLoading } = useOrg();
  
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchListings = useCallback(async () => {
    if (!user || !orgId) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('market_listings')
        .select('*')
        .eq('org_id', orgId)
        .eq('status', 'Active')
        .eq('is_distribution_warehouse', true)
        .order('size_sf', { ascending: false });

      if (error) throw error;
      
      // Map market_listings to Listing type format
      // is_distribution_warehouse maps to include_in_issue
      const mappedListings: Listing[] = (data || []).map(ml => ({
        id: ml.id,
        listing_id: ml.listing_id,
        property_name: ml.display_address || null,
        display_address: ml.display_address,
        address: ml.address,
        city: ml.city,
        submarket: ml.submarket,
        size_sf: ml.size_sf,
        clear_height_ft: ml.clear_height_ft ? Number(ml.clear_height_ft) : null,
        dock_doors: ml.dock_doors || 0,
        drive_in_doors: ml.drive_in_doors || 0,
        yard: (ml.yard as 'Yes' | 'No' | 'Unknown') || 'Unknown',
        availability_date: ml.availability_date,
        asking_rate_psf: ml.asking_rate_psf,
        op_costs: ml.op_costs,
        status: ml.status as 'Active' | 'Leased' | 'Removed' | 'OnHold',
        include_in_issue: ml.is_distribution_warehouse ?? false,
        landlord: ml.landlord,
        broker_source: ml.broker_source,
        notes_public: ml.notes_public,
        internal_note: ml.internal_note,
        link: ml.link,
        photo_url: null, // market_listings doesn't have photo_url
        last_verified_date: ml.last_verified_date,
        power_amps: ml.power_amps,
        sprinkler: ml.sprinkler,
        office_percent: null, // Not in market_listings
        cross_dock: (ml.cross_dock as 'Yes' | 'No' | 'Unknown') || 'Unknown',
        trailer_parking: (ml.trailer_parking as 'Yes' | 'No' | 'Unknown') || 'Unknown',
        org_id: ml.org_id,
        latitude: ml.latitude ? Number(ml.latitude) : null,
        longitude: ml.longitude ? Number(ml.longitude) : null,
        geocode_source: ml.geocode_source,
        geocoded_at: ml.geocoded_at,
        created_at: ml.created_at,
        updated_at: ml.updated_at,
      }));
      
      setListings(mappedListings);
    } catch (err) {
      console.error('Error fetching distribution listings:', err);
    } finally {
      setLoading(false);
    }
  }, [user, orgId]);

  useEffect(() => {
    if (user && orgId && !orgLoading) {
      fetchListings();
    }
  }, [user, orgId, orgLoading, fetchListings]);

  const refreshListings = useCallback(async () => {
    await fetchListings();
  }, [fetchListings]);

  return {
    listings,
    loading,
    refreshListings,
  };
}
