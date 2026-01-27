import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[fetch-market-listings] Missing environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Parse query parameters from URL
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    // Also support POST body for parameters
    let bodyParams: Record<string, string> = {};
    if (req.method === "POST") {
      try {
        bodyParams = await req.json();
      } catch {
        // Ignore JSON parse errors, use URL params only
      }
    }

    const search = searchParams.get("search") || bodyParams.search;
    const id = searchParams.get("id") || bodyParams.id;
    const countOnly = searchParams.get("count_only") === "true" || bodyParams.count_only === "true";
    const status = searchParams.get("status") || bodyParams.status;
    const staleBefore = searchParams.get("stale_before") || bodyParams.stale_before;

    console.log(`[fetch-market-listings] Query params: search=${search}, id=${id}, countOnly=${countOnly}, status=${status}, staleBefore=${staleBefore}`);

    // Build query
    let query = supabase
      .from("market_listings")
      .select("*", { count: "exact" });

    // Filter by ID if provided
    if (id) {
      query = query.eq("id", id);
    }

    // Filter by status if provided
    if (status) {
      query = query.eq("status", status);
    }

    // Filter by search term (address, city, submarket, or broker_source)
    if (search) {
      const searchTerm = `%${search}%`;
      query = query.or(
        `address.ilike.${searchTerm},city.ilike.${searchTerm},submarket.ilike.${searchTerm},broker_source.ilike.${searchTerm}`
      );
    }

    // Filter by stale_before (listings not updated since a date)
    if (staleBefore) {
      query = query.lt("updated_at", staleBefore);
    }

    // Order by size descending
    query = query.order("size_sf", { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error("[fetch-market-listings] Query error:", error.message);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return count only if requested
    if (countOnly) {
      console.log(`[fetch-market-listings] Returning count: ${count}`);
      return new Response(
        JSON.stringify({ count }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[fetch-market-listings] Returning ${data?.length || 0} listings`);
    return new Response(
      JSON.stringify({ data, count }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error(`[fetch-market-listings] Error: ${msg}`);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
