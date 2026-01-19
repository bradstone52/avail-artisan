import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrg } from '@/hooks/useOrg';
import { SheetConnection, Listing } from '@/lib/types';
import { parseCSV } from '@/lib/sheet-parser';
import { 
  mapRowToListing, 
  validateRequiredHeaders, 
  getMappedHeaders,
  validateFilterColumns,
  shouldIncludeRow,
} from '@/lib/field-mapping';
import { SyncReportData } from '@/lib/sync-report';
import { toast } from 'sonner';

/**
 * Hook for workspace-level sheet connection management.
 * All users can view the connection and listings within their org.
 * Admins can connect, disconnect, and sync.
 * Sync operators can run manual sync.
 */
export function useWorkspaceConnection() {
  const { user, session } = useAuth();
  const { isAdmin, canRunSync, loading: roleLoading } = useUserRole();
  const { orgId, loading: orgLoading } = useOrg();
  
  const [connection, setConnection] = useState<SheetConnection | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasOAuthToken, setHasOAuthToken] = useState(false);
  const [googleCredentialsExpired, setGoogleCredentialsExpired] = useState(false);
  const [lastSyncReport, setLastSyncReport] = useState<string | null>(null);
  const [lastSyncReportData, setLastSyncReportData] = useState<SyncReportData | null>(null);

  // Fetch the workspace-level connection (is_workspace_connection = true)
  const fetchConnection = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('sheet_connections')
        .select('*')
        .eq('is_workspace_connection', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching workspace connection:', error);
      }
      
      setConnection(data as SheetConnection | null);
    } catch (err) {
      console.error('Error fetching workspace connection:', err);
    }
  }, [user]);

  // Fetch listings for the user's org (RLS handles scoping automatically)
  const fetchListings = useCallback(async () => {
    if (!user || !orgId) return;

    try {
      // RLS automatically filters by org_id membership
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('org_id', orgId)
        .order('size_sf', { ascending: false });

      if (error) throw error;
      setListings(data as Listing[] || []);
    } catch (err) {
      console.error('Error fetching listings:', err);
    }
  }, [user, orgId]);

  // Check if there's a workspace OAuth token
  const checkOAuthToken = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('google_oauth_tokens')
        .select('id')
        .eq('is_workspace_token', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking OAuth token:', error);
      }
      
      setHasOAuthToken(!!data);
    } catch (err) {
      console.error('Error checking OAuth token:', err);
    }
  }, [user]);

  // Check for Google credentials expired
  const checkCredentialsExpired = useCallback(async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('sync_settings')
        .select('google_credentials_expired')
        .limit(1)
        .maybeSingle();

      setGoogleCredentialsExpired(data?.google_credentials_expired || false);
    } catch (err) {
      console.error('Error checking credentials status:', err);
    }
  }, [user]);

  // Initial fetch - wait for orgId to be available
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchConnection(), fetchListings(), checkOAuthToken(), checkCredentialsExpired()]);
      setLoading(false);
    };

    if (user && orgId && !orgLoading) {
      init();
    }
  }, [user, orgId, orgLoading, fetchConnection, fetchListings, checkOAuthToken]);

  // Listen for OAuth popup messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_OAUTH_SUCCESS' || event.data?.type === 'google-oauth-success') {
        setHasOAuthToken(true);
        toast.success('Google account connected for workspace!');
      } else if (event.data?.type === 'GOOGLE_OAUTH_ERROR' || event.data?.type === 'google-oauth-error') {
        toast.error('Failed to connect Google account');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Connect sheet (admin only)
  const connectSheet = async (
    url: string,
    name: string,
    tabName: string,
    connectionType: 'csv' | 'oauth' = 'csv',
    googleSheetId?: string
  ) => {
    if (!user || !isAdmin) {
      toast.error('Only admins can connect sheets');
      return;
    }

    // Delete any existing workspace connection first
    await supabase
      .from('sheet_connections')
      .delete()
      .eq('is_workspace_connection', true);

    const { data, error } = await supabase
      .from('sheet_connections')
      .insert({
        user_id: user.id,
        sheet_url: url,
        sheet_name: name,
        tab_name: tabName,
        connection_type: connectionType,
        google_sheet_id: googleSheetId || null,
        is_workspace_connection: true,
      })
      .select()
      .single();

    if (error) throw error;
    setConnection(data as SheetConnection);
  };

  // Start OAuth flow (admin only)
  const connectOAuth = async () => {
    if (!user || !isAdmin) {
      toast.error('Only admins can connect Google accounts');
      return;
    }

    if (!session?.access_token) {
      toast.error('Not authenticated');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('google-sheets-auth', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { isWorkspace: true },
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Redirect in the same tab
        window.location.assign(data.authUrl);
      }
    } catch (err) {
      console.error('OAuth error:', err);
      toast.error('Failed to start Google authorization');
    }
  };

  // Disconnect sheet (admin only)
  const disconnectSheet = async () => {
    if (!user || !isAdmin) {
      toast.error('Only admins can disconnect sheets');
      return;
    }

    // Delete workspace connection
    await supabase
      .from('sheet_connections')
      .delete()
      .eq('is_workspace_connection', true);

    // Delete all listings for this org
    if (orgId) {
      await supabase.from('listings').delete().eq('org_id', orgId);
    }

    setConnection(null);
    setListings([]);
    setLastSyncReport(null);
    setLastSyncReportData(null);
    toast.success('Sheet disconnected');
  };

  // Sync listings (admin or sync_operator) - full refresh approach
  const syncListings = async () => {
    if (!connection || !user) {
      toast.error('No sheet connection');
      return null;
    }
    
    if (!canRunSync) {
      toast.error('You do not have permission to sync');
      return null;
    }

    if (!session?.access_token) {
      toast.error('Not authenticated');
      return null;
    }

    setIsSyncing(true);
    const syncStartTime = new Date().toISOString();

    // Create sync log entry
    const { data: syncLog } = await supabase
      .from('sync_logs')
      .insert({
        run_type: 'manual',
        triggered_by: user.id,
        status: 'running',
      })
      .select()
      .single();

    const logId = syncLog?.id;

    // Initialize sync report data
    const reportData: SyncReportData = {
      timestamp: syncStartTime,
      rows_read: 0,
      rows_imported: 0,
      rows_skipped: 0,
      skipped_breakdown: {
        inactive: 0,
        not_distribution: 0,
        missing_fields: 0,
        duplicate_listing_id: 0,
      },
      skipped_details: [],
      missing_headers: [],
      success: false,
    };

    try {
      let csvText: string;

      if (connection.connection_type === 'oauth' && connection.google_sheet_id) {
        const { data, error } = await supabase.functions.invoke('google-sheets-sync', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: {
            spreadsheetId: connection.google_sheet_id,
            sheetName: connection.tab_name,
            headerRow: 2,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        csvText = data.data;
      } else {
        const response = await fetch(connection.sheet_url);
        if (!response.ok) throw new Error('Failed to fetch sheet');
        csvText = await response.text();
      }

      const rows = parseCSV(csvText);
      if (rows.length < 2) {
        throw new Error('Sheet appears to be empty');
      }

      const headers = rows[0];
      reportData.rows_read = rows.length - 1;

      // Check for filter columns - warn but don't fail
      const missingFilterCols = validateFilterColumns(headers);
      if (missingFilterCols.length > 0) {
        console.warn(`[Sync] Missing filter columns: ${missingFilterCols.join(', ')}. Will import all rows.`);
      }

      // Check for core required headers (ListingID, Address only)
      const missingRequired = validateRequiredHeaders(headers);
      if (missingRequired.length > 0) {
        console.warn(`[Sync] Missing required columns: ${missingRequired.join(', ')}. Rows without these values will be skipped.`);
      }

      // Get mapped headers info
      const { missing: missingOptional } = getMappedHeaders(headers);
      reportData.missing_headers = missingOptional;

      // PHASE 1: Stage all valid data first
      const stagedListings: Record<string, unknown>[] = [];
      const seenListingIds = new Set<string>();

      for (let i = 1; i < rows.length; i++) {
        const sheetRowNumber = i + 2;
        const row = rows[i];

        // Check filters
        const filterResult = shouldIncludeRow(row, headers);

        if (!filterResult.include) {
          reportData.rows_skipped++;

          if (filterResult.reason?.toLowerCase().includes('status')) {
            reportData.skipped_breakdown.inactive++;
          } else if (filterResult.reason?.toLowerCase().includes('distribution')) {
            reportData.skipped_breakdown.not_distribution++;
          }

          reportData.skipped_details.push({
            row: sheetRowNumber,
            reason: filterResult.reason || 'Excluded by filter',
          });
          continue;
        }

        const { listing } = mapRowToListing(row, headers, user.id, orgId || undefined);
        const listingId = (listing.listing_id as string)?.trim();
        const address = (listing.address as string)?.trim();

        // Only truly required: ListingID and Address
        if (!listingId) {
          reportData.rows_skipped++;
          reportData.skipped_breakdown.missing_fields++;
          reportData.skipped_details.push({
            row: sheetRowNumber,
            reason: 'Missing ListingID',
          });
          continue;
        }

        if (!address) {
          reportData.rows_skipped++;
          reportData.skipped_breakdown.missing_fields++;
          reportData.skipped_details.push({
            row: sheetRowNumber,
            reason: 'Missing Address',
          });
          continue;
        }

        if (seenListingIds.has(listingId)) {
          reportData.rows_skipped++;
          reportData.skipped_breakdown.duplicate_listing_id++;
          reportData.skipped_details.push({
            row: sheetRowNumber,
            reason: `Duplicate ListingID: ${listingId}`,
          });
          continue;
        }

        seenListingIds.add(listingId);
        stagedListings.push(listing);
      }

      if (stagedListings.length === 0) {
        throw new Error('No valid listings found after applying filters');
      }

      // PHASE 2: Atomic swap - delete only this org's listings
      console.log(`[Sync] Deleting existing listings for org: ${orgId}`);
      const { error: deleteError } = await supabase
        .from('listings')
        .delete()
        .eq('org_id', orgId);

      if (deleteError) {
        throw new Error(`Failed to clear old listings: ${deleteError.message}`);
      }

      console.log(`[Sync] Inserting ${stagedListings.length} new listings`);
      const { error: insertError } = await supabase
        .from('listings')
        .insert(stagedListings as never[]);

      if (insertError) {
        throw new Error(`Failed to insert new listings: ${insertError.message}`);
      }

      // Update last_synced_at
      await supabase
        .from('sheet_connections')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', connection.id);

      // Update sync log as successful
      if (logId) {
        await supabase.from('sync_logs').update({
          status: 'success',
          completed_at: new Date().toISOString(),
          rows_read: reportData.rows_read,
          rows_imported: stagedListings.length,
          rows_skipped: reportData.rows_skipped,
          skipped_breakdown: reportData.skipped_breakdown,
        }).eq('id', logId);
      }

      await fetchListings();
      await fetchConnection();

      reportData.success = true;
      reportData.rows_imported = stagedListings.length;
      setLastSyncReportData(reportData);

      const reportMessage = `Sync complete: ${reportData.rows_imported} imported, ${reportData.rows_skipped} skipped`;
      setLastSyncReport(reportMessage);

      toast.success(reportMessage);

      return { success: true, reportData };
    } catch (error) {
      console.error('Sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reportData.success = false;
      reportData.error_message = errorMessage;
      setLastSyncReportData(reportData);

      // Update sync log as failed
      if (logId) {
        await supabase.from('sync_logs').update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: errorMessage,
        }).eq('id', logId);
      }

      toast.error(`Sync failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setIsSyncing(false);
    }
  };

  const refreshListings = async () => {
    await fetchListings();
  };

  return {
    connection,
    listings,
    loading,
    isSyncing,
    hasOAuthToken,
    isAdmin,
    canRunSync,
    googleCredentialsExpired,
    roleLoading,
    lastSyncReport,
    lastSyncReportData,
    connectSheet,
    connectOAuth,
    disconnectSheet,
    syncListings,
    refreshListings,
  };
}
