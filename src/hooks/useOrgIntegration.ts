import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';
import { Listing } from '@/lib/types';
import { toast } from 'sonner';

interface OrgIntegration {
  org_id: string;
  google_refresh_token: string | null;
  google_access_token: string | null;
  google_token_expiry: string | null;
  sheet_url: string | null;
  sheet_id: string | null;
  tab_name: string | null;
  header_row: number | null;
  last_synced_at: string | null;
  updated_at: string;
}

interface SyncReportData {
  rows_imported: number;
  rows_skipped: number;
  skipped_breakdown: {
    inactive: number;
    not_distribution: number;
    missing_fields: number;
    duplicate_listing_id: number;
  };
}

export function useOrgIntegration() {
  const { user, session } = useAuth();
  const { orgId, isOrgAdmin, loading: orgLoading } = useOrg();
  
  const [integration, setIntegration] = useState<OrgIntegration | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncReport, setLastSyncReport] = useState<SyncReportData | null>(null);

  const hasGoogleConnection = !!(integration?.google_refresh_token);
  const hasSheetConfigured = !!(integration?.sheet_id);

  // Fetch org integration
  const fetchIntegration = useCallback(async () => {
    if (!user || !orgId) return;

    try {
      const { data, error } = await supabase
        .from('org_integrations')
        .select('*')
        .eq('org_id', orgId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching org integration:', error);
      }
      
      setIntegration(data as OrgIntegration | null);
    } catch (err) {
      console.error('Error fetching org integration:', err);
    }
  }, [user, orgId]);

  // Fetch listings for org
  const fetchListings = useCallback(async () => {
    if (!user || !orgId) return;

    try {
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

  // Initial fetch
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchIntegration(), fetchListings()]);
      setLoading(false);
    };

    if (user && orgId && !orgLoading) {
      init();
    }
  }, [user, orgId, orgLoading, fetchIntegration, fetchListings]);

  // Listen for OAuth success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_oauth') === 'success') {
      toast.success('Google Sheets connected!');
      fetchIntegration();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('google_oauth') === 'error') {
      toast.error(params.get('message') || 'OAuth failed');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchIntegration]);

  // Connect Google OAuth (admin only)
  const connectGoogle = async () => {
    if (!user || !isOrgAdmin || !orgId) {
      toast.error('Only org admins can connect Google');
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
        body: { orgId },
      });

      if (error) throw error;

      if (data?.authUrl) {
        window.location.assign(data.authUrl);
      }
    } catch (err) {
      console.error('OAuth error:', err);
      toast.error('Failed to start Google authorization');
    }
  };

  // Disconnect Google (admin only)
  const disconnectGoogle = async () => {
    if (!user || !isOrgAdmin || !orgId) {
      toast.error('Only org admins can disconnect Google');
      return;
    }

    try {
      const { error } = await supabase
        .from('org_integrations')
        .update({
          google_access_token: null,
          google_refresh_token: null,
          google_token_expiry: null,
        })
        .eq('org_id', orgId);

      if (error) throw error;

      await fetchIntegration();
      toast.success('Google disconnected');
    } catch (err) {
      console.error('Disconnect error:', err);
      toast.error('Failed to disconnect');
    }
  };

  // Update sheet settings (admin only)
  const updateSheetSettings = async (sheetUrl: string, tabName: string, headerRow: number) => {
    if (!user || !isOrgAdmin || !orgId) {
      toast.error('Only org admins can change settings');
      return;
    }

    // Extract sheet ID from URL
    const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const sheetId = match ? match[1] : null;

    if (!sheetId) {
      toast.error('Invalid Google Sheets URL');
      return;
    }

    try {
      const { error } = await supabase
        .from('org_integrations')
        .upsert({
          org_id: orgId,
          sheet_url: sheetUrl,
          sheet_id: sheetId,
          tab_name: tabName,
          header_row: headerRow,
          updated_by: user.id,
        }, { onConflict: 'org_id' });

      if (error) throw error;

      await fetchIntegration();
      toast.success('Sheet settings saved');
    } catch (err) {
      console.error('Settings error:', err);
      toast.error('Failed to save settings');
    }
  };

  // Sync listings (any org member)
  const syncListings = async () => {
    if (!user || !orgId) {
      toast.error('Not authenticated');
      return null;
    }

    if (!session?.access_token) {
      toast.error('Session expired');
      return null;
    }

    setIsSyncing(true);

    try {
      const { data, error } = await supabase.functions.invoke('org-sync', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { orgId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await fetchListings();
      await fetchIntegration();

      const report: SyncReportData = {
        rows_imported: data.rows_imported || 0,
        rows_skipped: data.rows_skipped || 0,
        skipped_breakdown: data.skipped_breakdown || {},
      };

      setLastSyncReport(report);
      toast.success(`Synced ${report.rows_imported} listings`);

      return { success: true, report };
    } catch (err) {
      console.error('Sync error:', err);
      const message = err instanceof Error ? err.message : 'Sync failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setIsSyncing(false);
    }
  };

  const refreshListings = async () => {
    await fetchListings();
  };

  return {
    integration,
    listings,
    loading,
    isSyncing,
    isOrgAdmin,
    hasGoogleConnection,
    hasSheetConfigured,
    lastSyncReport,
    connectGoogle,
    disconnectGoogle,
    updateSheetSettings,
    syncListings,
    refreshListings,
    refreshIntegration: fetchIntegration,
  };
}
