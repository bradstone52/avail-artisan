import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SheetConnection, Listing } from '@/lib/types';
import { parseCSV } from '@/lib/sheet-parser';
import { 
  mapRowToListing, 
  validateRequiredHeaders, 
  getMappedHeaders,
  validateFilterColumns,
  shouldIncludeRow,
  FILTER_COLUMNS,
} from '@/lib/field-mapping';
import { toast } from 'sonner';

export interface SyncReport {
  created_count: number;
  updated_count: number;
  skipped_count: number;
  skipped_rows: Array<{ row: number; reason: string }>;
  missing_headers: string[];
  filter_errors: string[]; // Missing filter columns
}

export function useSheetConnection() {
  const { user, session } = useAuth();
  const [connection, setConnection] = useState<SheetConnection | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasOAuthToken, setHasOAuthToken] = useState(false);
  const [lastSyncReport, setLastSyncReport] = useState<SyncReport | null>(null);

  const fetchConnection = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('sheet_connections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching connection:', error);
    }

    setConnection(data as SheetConnection | null);
    setLoading(false);
  }, [user]);

  const fetchListings = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('user_id', user.id)
      .order('size_sf', { ascending: false });

    if (error) {
      console.error('Error fetching listings:', error);
      return;
    }

    setListings(data as Listing[]);
  }, [user]);

  const checkOAuthToken = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('google_oauth_tokens')
      .select('id')
      .eq('user_id', user.id)
      .single();

    setHasOAuthToken(!!data);
  }, [user]);

  useEffect(() => {
    fetchConnection();
    fetchListings();
    checkOAuthToken();
  }, [fetchConnection, fetchListings, checkOAuthToken]);

  // Listen for OAuth success messages from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'google-oauth-success') {
        setHasOAuthToken(true);
        toast.success('Google account connected! Now select your sheet.');
      } else if (event.data?.type === 'google-oauth-error') {
        toast.error(event.data.error || 'OAuth failed');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const connectSheet = async (
    url: string, 
    name: string, 
    tabName: string, 
    connectionType: 'csv' | 'oauth' = 'csv',
    googleSheetId?: string
  ) => {
    if (!user) throw new Error('Not authenticated');

    // Delete existing connection
    await supabase
      .from('sheet_connections')
      .delete()
      .eq('user_id', user.id);

    // Create new connection
    const { data, error } = await supabase
      .from('sheet_connections')
      .insert({
        user_id: user.id,
        sheet_url: url,
        sheet_name: name,
        tab_name: tabName,
        connection_type: connectionType,
        google_sheet_id: googleSheetId || null,
      })
      .select()
      .single();

    if (error) throw error;

    setConnection(data as SheetConnection);
  };

  const connectOAuth = async () => {
    if (!session?.access_token) {
      toast.error('Not authenticated');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('google-sheets-auth', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Redirect in the same tab (avoids Firefox COOP popup restrictions)
        window.location.assign(data.authUrl);
      }
    } catch (error) {
      console.error('OAuth error:', error);
      toast.error('Failed to start Google authorization');
    }
  };

  const disconnectSheet = async () => {
    if (!user || !connection) return;

    await supabase
      .from('sheet_connections')
      .delete()
      .eq('id', connection.id);

    // Also delete all listings
    await supabase
      .from('listings')
      .delete()
      .eq('user_id', user.id);

    setConnection(null);
    setListings([]);
    toast.success('Sheet disconnected');
  };

  const syncListings = async (): Promise<SyncReport | null> => {
    if (!user || !connection) {
      toast.error('No sheet connected');
      return null;
    }

    setIsSyncing(true);
    setLastSyncReport(null);

    const syncReport: SyncReport = {
      created_count: 0,
      updated_count: 0,
      skipped_count: 0,
      skipped_rows: [],
      missing_headers: [],
      filter_errors: [],
    };

    try {
      let csvText: string;

      if (connection.connection_type === 'oauth') {
        // Use OAuth sync edge function with headerRow = 2
        if (!session?.access_token) {
          throw new Error('Not authenticated');
        }

        const { data, error } = await supabase.functions.invoke('google-sheets-sync', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: {
            spreadsheetId: (connection as SheetConnection & { google_sheet_id?: string }).google_sheet_id,
            sheetName: connection.tab_name,
            headerRow: 2, // Headers are on row 2
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        csvText = data.data;
      } else {
        // Fetch CSV from the published URL
        const response = await fetch(connection.sheet_url);
        if (!response.ok) {
          throw new Error('Failed to fetch sheet data. Make sure the sheet is published.');
        }
        csvText = await response.text();
      }

      const rows = parseCSV(csvText);

      if (rows.length < 2) {
        throw new Error('Sheet appears to be empty');
      }

      const headers = rows[0];
      
      // Validate required headers using field mapping
      const missingRequired = validateRequiredHeaders(headers);
      if (missingRequired.length > 0) {
        throw new Error(`Missing required columns: ${missingRequired.join(', ')}`);
      }

      // Validate filter columns (Status, Distribution Warehouse?)
      const missingFilterCols = validateFilterColumns(headers);
      if (missingFilterCols.length > 0) {
        syncReport.filter_errors = missingFilterCols;
        throw new Error(`Missing required columns: ${missingFilterCols.join(', ')}`);
      }

      // Get all mapped headers info for the report
      const { missing: missingOptional } = getMappedHeaders(headers);
      syncReport.missing_headers = missingOptional;

      // Get existing listings to determine create vs update
      const { data: existingListings } = await supabase
        .from('listings')
        .select('listing_id')
        .eq('user_id', user.id);

      const existingListingIds = new Set(
        (existingListings || []).map(l => l.listing_id)
      );

      // Parse all data rows using header-based mapping
      const listingsToUpsert: Record<string, unknown>[] = [];
      const seenListingIds = new Set<string>();

      for (let i = 1; i < rows.length; i++) {
        const sheetRowNumber = i + 2; // +2 because: +1 for 0-indexed, +1 because header is row 2
        
        // FILTER: Check Status="Active" AND "Distribution Warehouse?"=TRUE
        const filterResult = shouldIncludeRow(rows[i], headers);
        if (!filterResult.include) {
          syncReport.skipped_count++;
          syncReport.skipped_rows.push({
            row: sheetRowNumber,
            reason: filterResult.reason || 'Excluded by filter',
          });
          continue;
        }
        
        const { listing, missingHeaders } = mapRowToListing(rows[i], headers, user.id);
        
        // Check if ListingID is present and not blank
        const listingId = (listing.listing_id as string)?.trim();
        
        if (!listingId) {
          syncReport.skipped_count++;
          syncReport.skipped_rows.push({
            row: sheetRowNumber,
            reason: 'ListingID is missing or blank',
          });
          continue;
        }

        // Check for duplicate ListingID in this sync batch
        if (seenListingIds.has(listingId)) {
          syncReport.skipped_count++;
          syncReport.skipped_rows.push({
            row: sheetRowNumber,
            reason: `Duplicate ListingID "${listingId}" (already seen in this sync)`,
          });
          continue;
        }

        seenListingIds.add(listingId);

        // Check if required fields are missing in this row
        if (missingHeaders.length > 0) {
          syncReport.skipped_count++;
          syncReport.skipped_rows.push({
            row: sheetRowNumber,
            reason: `Missing required: ${missingHeaders.join(', ')}`,
          });
          continue;
        }

        // Track if this is a create or update
        if (existingListingIds.has(listingId)) {
          syncReport.updated_count++;
        } else {
          syncReport.created_count++;
        }

        listingsToUpsert.push(listing);
      }

      if (listingsToUpsert.length === 0) {
        setLastSyncReport(syncReport);
        throw new Error('No valid listings found in the sheet');
      }

      // UPSERT: Use onConflict to update existing records by listing_id
      const { error: upsertError } = await supabase
        .from('listings')
        .upsert(listingsToUpsert as never[], {
          onConflict: 'user_id,listing_id',
          ignoreDuplicates: false,
        });

      if (upsertError) throw upsertError;

      // Update sync timestamp
      await supabase
        .from('sheet_connections')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', connection.id);

      // Refresh data
      await fetchConnection();
      await fetchListings();

      setLastSyncReport(syncReport);

      // Show sync report toast
      const reportMessage = [
        `Created: ${syncReport.created_count}`,
        `Updated: ${syncReport.updated_count}`,
        syncReport.skipped_count > 0 ? `Skipped: ${syncReport.skipped_count}` : null,
      ].filter(Boolean).join(' | ');

      if (syncReport.skipped_count > 0 || syncReport.missing_headers.length > 0) {
        toast.warning(`Sync Complete - ${reportMessage}`);
        if (syncReport.missing_headers.length > 0) {
          console.log('Missing optional headers:', syncReport.missing_headers);
        }
        if (syncReport.skipped_rows.length > 0) {
          console.log('Skipped rows:', syncReport.skipped_rows);
        }
      } else {
        toast.success(`Sync Complete - ${reportMessage}`);
      }

      return syncReport;
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sync listings');
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    connection,
    listings,
    loading,
    isSyncing,
    hasOAuthToken,
    lastSyncReport,
    connectSheet,
    connectOAuth,
    disconnectSheet,
    syncListings,
    refreshListings: fetchListings,
  };
}
