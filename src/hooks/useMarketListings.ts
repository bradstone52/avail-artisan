import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';
import { toast } from 'sonner';

export interface MarketListing {
  id: string;
  listing_id: string;
  address: string;
  display_address: string | null;
  city: string;
  submarket: string;
  size_sf: number;
  warehouse_sf: number | null;
  office_sf: number | null;
  clear_height_ft: number | null;
  dock_doors: number | null;
  drive_in_doors: number | null;
  status: string;
  listing_type: string | null;
  landlord: string | null;
  broker_source: string | null;
  asking_rate_psf: string | null;
  availability_date: string | null;
  link: string | null;
  link_status: string | null;
  link_last_checked: string | null;
  brochure_search_url: string | null;
  is_distribution_warehouse: boolean | null;
  latitude: number | null;
  longitude: number | null;
  geocoded_at: string | null;
  geocode_source: string | null;
  created_at: string;
  updated_at: string;
  org_id: string | null;
  user_id: string;
  // Additional fields
  yard: string | null;
  yard_area: string | null;
  cross_dock: string | null;
  trailer_parking: string | null;
  sprinkler: string | null;
  power_amps: string | null;
  voltage: string | null;
  cranes: string | null;
  crane_tons: string | null;
  zoning: string | null;
  land_acres: string | null;
  mua: string | null;
  op_costs: string | null;
  gross_rate: string | null;
  sale_price: string | null;
  sublease_exp: string | null;
  notes_public: string | null;
  internal_note: string | null;
}

export interface MarketSyncLog {
  id: string;
  org_id: string | null;
  run_type: string;
  triggered_by: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  rows_read: number | null;
  rows_imported: number | null;
  rows_skipped: number | null;
  skipped_breakdown: Record<string, number> | null;
  links_checked: number | null;
  links_ok: number | null;
  links_bad: number | null;
  error_message: string | null;
  created_at: string;
}

export function useMarketListings() {
  const { user, session } = useAuth();
  const { orgId, loading: orgLoading } = useOrg();

  const [listings, setListings] = useState<MarketListing[]>([]);
  const [syncLogs, setSyncLogs] = useState<MarketSyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isValidatingLinks, setIsValidatingLinks] = useState(false);

  // Fetch market listings for the org
  const fetchListings = useCallback(async () => {
    if (!user || !orgId) return;

    try {
      const { data, error } = await supabase
        .from('market_listings')
        .select('*')
        .eq('org_id', orgId)
        .order('size_sf', { ascending: false });

      if (error) throw error;
      setListings((data as MarketListing[]) || []);
    } catch (err) {
      console.error('Error fetching market listings:', err);
    }
  }, [user, orgId]);

  // Fetch sync logs
  const fetchSyncLogs = useCallback(async () => {
    if (!user || !orgId) return;

    try {
      const { data, error } = await supabase
        .from('market_sync_logs')
        .select('*')
        .eq('org_id', orgId)
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSyncLogs((data as MarketSyncLog[]) || []);
    } catch (err) {
      console.error('Error fetching market sync logs:', err);
    }
  }, [user, orgId]);

  // Initial fetch
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchListings(), fetchSyncLogs()]);
      setLoading(false);
    };

    if (user && orgId && !orgLoading) {
      init();
    }
  }, [user, orgId, orgLoading, fetchListings, fetchSyncLogs]);

  // Trigger market sync
  const syncMarketListings = async () => {
    if (!user || !session?.access_token) {
      toast.error('Not authenticated');
      return null;
    }

    if (!orgId) {
      toast.error('No organization found');
      return null;
    }

    setIsSyncing(true);

    try {
      const { data, error } = await supabase.functions.invoke('market-sync', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { orgId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Synced ${data.rows_imported} market listings`);
      
      // Refresh data
      await Promise.all([fetchListings(), fetchSyncLogs()]);
      
      return data;
    } catch (err) {
      console.error('Market sync error:', err);
      toast.error(err instanceof Error ? err.message : 'Sync failed');
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  // Validate brochure links
  const validateLinks = async () => {
    if (!user || !session?.access_token) {
      toast.error('Not authenticated');
      return null;
    }

    setIsValidatingLinks(true);

    try {
      const { data, error } = await supabase.functions.invoke('validate-brochure-links', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const message = `Checked ${data.checked} links: ${data.ok} ok, ${data.broken} broken`;
      if (data.remaining > 0) {
        toast.success(`${message}. ${data.remaining} remaining - run again to continue.`);
      } else {
        toast.success(message);
      }
      
      // Refresh listings to show updated status
      await fetchListings();
      
      return data;
    } catch (err) {
      console.error('Link validation error:', err);
      toast.error(err instanceof Error ? err.message : 'Validation failed');
      return null;
    } finally {
      setIsValidatingLinks(false);
    }
  };

  // Refresh listings
  const refreshListings = async () => {
    await fetchListings();
  };

  return {
    listings,
    syncLogs,
    loading,
    isSyncing,
    isValidatingLinks,
    syncMarketListings,
    validateLinks,
    refreshListings,
    refetchSyncLogs: fetchSyncLogs,
  };
}
