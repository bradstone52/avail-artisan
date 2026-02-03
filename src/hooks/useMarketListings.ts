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
  last_verified_date: string | null;
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
  building_depth: string | null;
  mua: string | null;
  op_costs: string | null;
  gross_rate: string | null;
  sale_price: string | null;
  sublease_exp: string | null;
  notes_public: string | null;
  internal_note: string | null;
  property_tax: string | null;
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
  const [isValidatingLinks, setIsValidatingLinks] = useState(false);
  const [linkCheckTotal, setLinkCheckTotal] = useState(0); // Total links to check
  const [linkCheckStartedAt, setLinkCheckStartedAt] = useState<string | null>(null);
  const [linkCheckBaseline, setLinkCheckBaseline] = useState<Record<string, string | null>>({});
  const [linkCheckChecked, setLinkCheckChecked] = useState(0);

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

  // Fetch sync logs (for historical reference only)
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

  // Track if initial data has been loaded to prevent refetch on tab focus
  const [hasInitialData, setHasInitialData] = useState(false);

  // Initial fetch and realtime subscription
  useEffect(() => {
    if (!user || !orgId || orgLoading) return;

    // Only fetch if we haven't loaded data yet (prevents refetch on tab focus)
    const init = async () => {
      if (!hasInitialData) {
        setLoading(true);
        await Promise.all([fetchListings(), fetchSyncLogs()]);
        setHasInitialData(true);
        setLoading(false);
      }
    };

    init();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('market_listings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_listings',
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          // Avoid refetching the whole table for every row update (link check updates hundreds of rows).
          // Instead, patch local state; this keeps the "X left" counter responsive.
          const evt = payload.eventType;
          const next = payload.new as Partial<MarketListing> | null;
          const prev = payload.old as Partial<MarketListing> | null;

          if (evt === 'UPDATE' && next?.id) {
            setListings((curr) => curr.map((row) => (row.id === next.id ? ({ ...row, ...next } as MarketListing) : row)));
            return;
          }

          // For INSERT/DELETE (rare here), fall back to a refetch to keep ordering consistent.
          if (evt === 'INSERT' || evt === 'DELETE') {
            fetchListings();
            return;
          }

          // If we can't safely patch, refetch.
          if (prev?.id || next?.id) {
            fetchListings();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, orgId, orgLoading, fetchListings, fetchSyncLogs, hasInitialData]);

  // Validate brochure links
  const validateLinks = async () => {
    if (!user || !session?.access_token) {
      toast.error('Not authenticated');
      return null;
    }

    // Snapshot current link_last_checked so we can compute progress reliably even if
    // the database formats timestamps differently.
    const baseline: Record<string, string | null> = {};
    const linksWithUrl = listings.filter((l) => !!l.link && l.link !== '');
    for (const l of linksWithUrl) baseline[l.id] = l.link_last_checked;

    setIsValidatingLinks(true);
    setLinkCheckBaseline(baseline);
    setLinkCheckChecked(0);
    setLinkCheckStartedAt(null);
    setLinkCheckTotal(linksWithUrl.length);

    try {
      const { data, error } = await supabase.functions.invoke('validate-brochure-links', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { force: true }, // Always re-check all links
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // We return immediately now; progress is shown via realtime updates.
      const startedAt = typeof data?.run_started_at === 'string' ? data.run_started_at : null;
      const total = typeof data?.total === 'number' ? data.total : 0;

      setLinkCheckStartedAt(startedAt);
      // Prefer backend total (source of truth), but fall back to our computed value.
      setLinkCheckTotal(total || linksWithUrl.length);

      toast.success(`Checking ${total} links...`);

      // No await here; edge function runs in background.
      return data;
    } catch (err) {
      console.error('Link validation error:', err);
      toast.error(err instanceof Error ? err.message : 'Validation failed');
      setIsValidatingLinks(false);
      setLinkCheckTotal(0);
      setLinkCheckStartedAt(null);
      setLinkCheckBaseline({});
      setLinkCheckChecked(0);
      return null;
    } finally {
      // Keep isValidatingLinks true while the background job runs; the UI will
      // turn it off when it detects completion.
    }
  };

  // Compute progress based on baseline snapshot.
  useEffect(() => {
    if (!isValidatingLinks || linkCheckTotal <= 0) return;

    const linksWithUrl = listings.filter((l) => !!l.link && l.link !== '');
    const changed = linksWithUrl.filter((l) => (linkCheckBaseline[l.id] ?? null) !== l.link_last_checked).length;
    setLinkCheckChecked(changed);

    if (changed >= linkCheckTotal) {
      const ok = linksWithUrl.filter((l) => (linkCheckBaseline[l.id] ?? null) !== l.link_last_checked && l.link_status === 'ok').length;
      const broken = linksWithUrl.filter((l) => (linkCheckBaseline[l.id] ?? null) !== l.link_last_checked && l.link_status === 'broken').length;

      setIsValidatingLinks(false);
      setLinkCheckTotal(0);
      setLinkCheckStartedAt(null);
      setLinkCheckBaseline({});
      setLinkCheckChecked(0);
      toast.success(`Link check complete: ${ok} ok, ${broken} broken`);
    }
  }, [isValidatingLinks, linkCheckTotal, linkCheckBaseline, listings]);

  // Refresh listings
  const refreshListings = async () => {
    await fetchListings();
  };

  return {
    listings,
    syncLogs,
    loading,
    isSyncing: false, // No longer syncing from Google Sheets
    isValidatingLinks,
    linkCheckTotal,
    linkCheckStartedAt,
    linkCheckChecked,
    syncMarketListings: async () => {
      toast.info('Google Sheets sync has been disabled. Manage listings directly in the app.');
      return null;
    },
    validateLinks,
    refreshListings,
    refetchSyncLogs: fetchSyncLogs,
  };
}
