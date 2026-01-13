import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SheetConnection, Listing } from "@/lib/types";
import { toast } from "sonner";

/**
 * Hook for per-user sheet connection management.
 * For workspace-level connections, use useWorkspaceConnection instead.
 */
export const useSheetConnection = () => {
  const { user, session } = useAuth();
  const [connection, setConnection] = useState<SheetConnection | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchConnection = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("sheet_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_workspace_connection", false)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setConnection(data as SheetConnection | null);
    } catch (error) {
      console.error("Error fetching connection:", error);
    }
  }, [user]);

  const fetchListings = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("user_id", user.id)
        .order("size_sf", { ascending: false });

      if (error) throw error;
      setListings(data as Listing[] || []);
    } catch (error) {
      console.error("Error fetching listings:", error);
    }
  }, [user]);

  const connectOAuth = async () => {
    if (!user || !session?.access_token) {
      toast.error("Not authenticated");
      return;
    }

    try {
      setLoading(true);

      // Build an absolute return URL
      const returnTo = `${window.location.origin}/dashboard?google_oauth=success`;

      const { data, error } = await supabase.functions.invoke("google-sheets-auth", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { returnTo, isWorkspace: false },
      });

      if (error) throw error;

      if (data?.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error("No auth URL returned");
      }
    } catch (error) {
      console.error("OAuth connection error:", error);
      toast.error("Failed to start Google authorization");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const saveConnection = async (
    sheetUrl: string,
    sheetName: string,
    tabName: string,
    connectionType: 'csv' | 'oauth' = 'csv',
    googleSheetId?: string
  ) => {
    if (!user) {
      toast.error("Not authenticated");
      return null;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("sheet_connections")
        .upsert({
          user_id: user.id,
          sheet_url: sheetUrl,
          sheet_name: sheetName,
          tab_name: tabName,
          connection_type: connectionType,
          google_sheet_id: googleSheetId || null,
          is_workspace_connection: false,
        })
        .select()
        .single();

      if (error) throw error;

      setConnection(data as SheetConnection);
      return data;
    } catch (error) {
      console.error("Error saving connection:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const syncListings = async () => {
    if (!connection || !user || !session?.access_token) {
      toast.error("No sheet connection or not authenticated");
      return null;
    }

    try {
      setIsSyncing(true);

      const { data, error } = await supabase.functions.invoke("google-sheets-sync", {
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

      await fetchConnection();
      await fetchListings();
      
      return data;
    } catch (error) {
      console.error("Sync error:", error);
      throw error;
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
    fetchConnection,
    fetchListings,
    connectOAuth,
    saveConnection,
    syncListings,
    refreshListings,
  };
};
