import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tables to back up with their key columns
const BACKUP_TABLES = [
  "deals",
  "deal_conditions",
  "deal_deposits",
  "deal_documents",
  "deal_important_dates",
  "deal_summary_actions",
  "market_listings",
  "internal_listings",
  "internal_listing_documents",
  "internal_listing_inquiries",
  "internal_listing_inquiry_timeline",
  "internal_listing_photos",
  "internal_listing_tours",
  "properties",
  "property_tenants",
  "transactions",
  "prospects",
  "prospect_follow_up_dates",
  "distribution_recipients",
  "distribution_batches",
  "distribution_recipient_batch_status",
  "brokerages",
  "agents",
  "profiles",
  "invites",
  "org_members",
  "orgs",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate the caller - must be admin
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authedClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await authedClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check admin
    const { data: isAdmin } = await adminClient.rpc("is_admin", { _user_id: userData.user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden - admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const backupFolder = `backup-${dateStr}`;
    const results: Array<{ table: string; rows: number; status: string }> = [];
    const errors: Array<{ table: string; error: string }> = [];

    for (const tableName of BACKUP_TABLES) {
      try {
        // Fetch all rows (service role bypasses RLS)
        let allRows: any[] = [];
        let offset = 0;
        const pageSize = 1000;

        while (true) {
          const { data, error } = await adminClient
            .from(tableName)
            .select("*")
            .range(offset, offset + pageSize - 1);

          if (error) throw error;
          if (!data || data.length === 0) break;
          allRows = allRows.concat(data);
          if (data.length < pageSize) break;
          offset += pageSize;
        }

        if (allRows.length === 0) {
          results.push({ table: tableName, rows: 0, status: "empty" });
          continue;
        }

        // Convert to JSON and upload to storage
        const jsonData = JSON.stringify(allRows, null, 2);
        const filePath = `${backupFolder}/${tableName}.json`;

        const { error: uploadError } = await adminClient.storage
          .from("data-backups")
          .upload(filePath, new Blob([jsonData], { type: "application/json" }), {
            contentType: "application/json",
            upsert: true,
          });

        if (uploadError) throw uploadError;

        results.push({ table: tableName, rows: allRows.length, status: "ok" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ table: tableName, error: msg });
        results.push({ table: tableName, rows: 0, status: "error" });
      }
    }

    const totalRows = results.reduce((sum, r) => sum + r.rows, 0);

    return new Response(
      JSON.stringify({
        success: true,
        backup_folder: backupFolder,
        total_tables: BACKUP_TABLES.length,
        total_rows: totalRows,
        errors: errors.length > 0 ? errors : undefined,
        details: results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[export-backup] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
