import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SheetConnection, Listing } from '@/lib/types';
import { parseCSV, validateHeaders, parseListingRow } from '@/lib/sheet-parser';
import { toast } from 'sonner';

export function useSheetConnection() {
  const { user, session } = useAuth();
  const [connection, setConnection] = useState<SheetConnection | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasOAuthToken, setHasOAuthToken] = useState(false);

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
        // Open OAuth popup
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        window.open(
          data.authUrl,
          'google-oauth',
          `width=${width},height=${height},left=${left},top=${top}`
        );
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

  const syncListings = async () => {
    if (!user || !connection) {
      toast.error('No sheet connected');
      return;
    }

    setIsSyncing(true);

    try {
      let csvText: string;

      if (connection.connection_type === 'oauth') {
        // Use OAuth sync edge function
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

      // Parse all data rows
      const parsedListings: Listing[] = [];
      const errors: string[] = [];

      for (let i = 1; i < rows.length; i++) {
        const parsed = parseListingRow(rows[i], headers, i + 1);
        
        if (parsed.isValid && parsed.data.listing_id) {
          parsedListings.push({
            ...parsed.data,
            id: '',
            user_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as Listing);
        } else {
          parsed.errors.forEach(err => {
            errors.push(`Row ${err.row}: ${err.message}`);
          });
        }
      }

      if (parsedListings.length === 0) {
        throw new Error('No valid listings found in the sheet');
      }

      // Delete existing listings and insert new ones
      await supabase
        .from('listings')
        .delete()
        .eq('user_id', user.id);

      const { error: insertError } = await supabase
        .from('listings')
        .insert(parsedListings.map(l => ({
          user_id: user.id,
          listing_id: l.listing_id,
          property_name: l.property_name,
          address: l.address,
          city: l.city,
          submarket: l.submarket,
          size_sf: l.size_sf,
          clear_height_ft: l.clear_height_ft,
          dock_doors: l.dock_doors,
          drive_in_doors: l.drive_in_doors,
          yard: l.yard,
          availability_date: l.availability_date,
          asking_rate_psf: l.asking_rate_psf,
          status: l.status,
          include_in_issue: l.include_in_issue,
          landlord: l.landlord,
          broker_source: l.broker_source,
          notes_public: l.notes_public,
          internal_note: l.internal_note,
          link: l.link,
          photo_url: l.photo_url,
          last_verified_date: l.last_verified_date,
          power_amps: l.power_amps,
          sprinkler: l.sprinkler,
          office_percent: l.office_percent,
          cross_dock: l.cross_dock,
          trailer_parking: l.trailer_parking,
        })));

      if (insertError) throw insertError;

      // Update sync timestamp
      await supabase
        .from('sheet_connections')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', connection.id);

      // Refresh data
      await fetchConnection();
      await fetchListings();

      if (errors.length > 0) {
        toast.warning(`Synced ${parsedListings.length} listings with ${errors.length} errors`);
      } else {
        toast.success(`Successfully synced ${parsedListings.length} listings`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sync listings');
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
    connectSheet,
    connectOAuth,
    disconnectSheet,
    syncListings,
    refreshListings: fetchListings,
  };
}
