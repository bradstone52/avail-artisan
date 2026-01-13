import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SheetConnection {
  id: string;
  sheet_id: string;
  sheet_name: string;
  tab_name: string;
  header_row: number;
  created_at: string;
  last_synced_at: string | null;
}

export const useSheetConnection = () => {
  const [connection, setConnection] = useState<SheetConnection | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchConnection = async () => {
    try {
      const { data, error } = await supabase.from("sheet_connections").select("*").maybeSingle();

      if (error) throw error;
      setConnection(data);
    } catch (error) {
      console.error("Error fetching connection:", error);
    }
  };

  const connectOAuth = async () => {
    try {
      setLoading(true);

      // ✅ IMPORTANT: tell the backend where to send us back after OAuth
      const returnTo = window.location.href;

      const { data, error } = await supabase.functions.invoke("google-sheets-auth", {
        body: { returnTo },
      });

      if (error) throw error;

      if (data?.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error("No auth URL returned");
      }
    } catch (error) {
      console.error("OAuth connection error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const saveConnection = async (sheetId: string, sheetName: string, tabName: string, headerRow: number) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("sheet_connections")
        .upsert({
          sheet_id: sheetId,
          sheet_name: sheetName,
          tab_name: tabName,
          header_row: headerRow,
          last_synced_at: null,
        })
        .select()
        .single();

      if (error) throw error;

      setConnection(data);
      return data;
    } catch (error) {
      console.error("Error saving connection:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const syncListings = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke("sync-listings", {
        body: { forceFreshPull: true }, // keeps intent explicit
      });

      if (error) throw error;

      await fetchConnection();
      return data;
    } catch (error) {
      console.error("Sync error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    connection,
    loading,
    fetchConnection,
    connectOAuth,
    saveConnection,
    syncListings,
  };
};
