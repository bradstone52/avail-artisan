import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SheetConnection, Listing } from '@/lib/types';
import { parseCSV, validateHeaders, parseListingRow } from '@/lib/sheet-parser';
import { toast } from 'sonner';

export interface SyncReport {
  created_count: number;
  updated_count: number;
  skipped_count: number;
  skipped_rows: Array<{ row: number; reason: string }>;
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
      const { valid, missing } = validateHeaders(headers);

      if (!valid) {
        throw new Error(`Missing required columns: ${missing.join(', ')}`);
      }

      // Get existing listings to determine create vs update
      const { data: existingListings } = await supabase
        .from('listings')
        .select('listing_id')
        .eq('user_id', user.id);

      const existingListingIds = new Set(
        (existingListings || []).map(l => l.listing_id)
      );

      // Parse all data rows - ListingID is REQUIRED
      const listingsToUpsert: Array<{
        user_id: string;
        listing_id: string;
        property_name: string | null;
        address: string;
        city: string;
        submarket: string;
        size_sf: number;
        clear_height_ft: number | null;
        dock_doors: number;
        drive_in_doors: number;
        yard: string;
        availability_date: string | null;
        asking_rate_psf: string | null;
        status: string;
        include_in_issue: boolean;
        landlord: string | null;
        broker_source: string | null;
        notes_public: string | null;
        internal_note: string | null;
        link: string | null;
        photo_url: string | null;
        last_verified_date: string | null;
        power_amps: string | null;
        sprinkler: string | null;
        office_percent: string | null;
        cross_dock: string;
        trailer_parking: string;
      }> = [];

      const seenListingIds = new Set<string>();

      for (let i = 1; i < rows.length; i++) {
        const sheetRowNumber = i + 2; // +2 because: +1 for 0-indexed, +1 because header is row 2
        const parsed = parseListingRow(rows[i], headers, sheetRowNumber);
        
        // Check if ListingID is present and not blank
        const listingId = parsed.data.listing_id?.trim();
        
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

        // Check if other required fields are valid
        if (!parsed.isValid) {
          const errorMessages = parsed.errors
            .filter(e => e.field !== 'ListingID')
            .map(e => e.message)
            .join('; ');
          
          if (errorMessages) {
            syncReport.skipped_count++;
            syncReport.skipped_rows.push({
              row: sheetRowNumber,
              reason: errorMessages,
            });
            continue;
          }
        }

        // Track if this is a create or update
        if (existingListingIds.has(listingId)) {
          syncReport.updated_count++;
        } else {
          syncReport.created_count++;
        }

        listingsToUpsert.push({
          user_id: user.id,
          listing_id: listingId,
          property_name: parsed.data.property_name || null,
          address: parsed.data.address || '',
          city: parsed.data.city || '',
          submarket: parsed.data.submarket || '',
          size_sf: parsed.data.size_sf || 0,
          clear_height_ft: parsed.data.clear_height_ft || null,
          dock_doors: parsed.data.dock_doors || 0,
          drive_in_doors: parsed.data.drive_in_doors || 0,
          yard: parsed.data.yard || 'Unknown',
          availability_date: parsed.data.availability_date || null,
          asking_rate_psf: parsed.data.asking_rate_psf || null,
          status: parsed.data.status || 'Active',
          include_in_issue: parsed.data.include_in_issue ?? true,
          landlord: parsed.data.landlord || null,
          broker_source: parsed.data.broker_source || null,
          notes_public: parsed.data.notes_public || null,
          internal_note: parsed.data.internal_note || null,
          link: parsed.data.link || null,
          photo_url: parsed.data.photo_url || null,
          last_verified_date: parsed.data.last_verified_date || null,
          power_amps: parsed.data.power_amps || null,
          sprinkler: parsed.data.sprinkler || null,
          office_percent: parsed.data.office_percent || null,
          cross_dock: parsed.data.cross_dock || 'Unknown',
          trailer_parking: parsed.data.trailer_parking || 'Unknown',
        });
      }

      if (listingsToUpsert.length === 0) {
        setLastSyncReport(syncReport);
        throw new Error('No valid listings found in the sheet');
      }

      // UPSERT: Use onConflict to update existing records by listing_id
      const { error: upsertError } = await supabase
        .from('listings')
        .upsert(listingsToUpsert, {
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

      if (syncReport.skipped_count > 0) {
        toast.warning(`Sync Complete - ${reportMessage}`);
        console.log('Skipped rows:', syncReport.skipped_rows);
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
