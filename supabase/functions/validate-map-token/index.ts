import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ShareLink {
  id: string;
  token: string;
  created_at: string;
  expires_at: string | null;
  created_by: string | null;
  issue_id: string | null;
  report_type: string;
  filters: Record<string, unknown>;
  listing_ids: string[] | null;
  listing_snapshot: PublicListing[] | null;
  is_active: boolean;
  org_id: string | null;
}

interface PublicListing {
  id: string;
  listing_id: string;
  address: string;
  display_address: string | null;
  property_name: string | null;
  city: string;
  submarket: string;
  size_sf: number;
  clear_height_ft: number | null;
  dock_doors: number | null;
  drive_in_doors: number | null;
  availability_date: string | null;
  latitude: number | null;
  longitude: number | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get token from query params or body
    const url = new URL(req.url);
    let token = url.searchParams.get("token");
    
    if (!token && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      token = body.token;
    }

    if (!token) {
      console.log("[validate-map-token] Missing token");
      return new Response(
        JSON.stringify({ error: "Missing token", valid: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[validate-map-token] Validating token: ${token.substring(0, 8)}...`);

    // Validate token exists, is active, and not expired
    const { data: shareLink, error: linkError } = await supabase
      .from("share_links")
      .select("*")
      .eq("token", token)
      .eq("is_active", true)
      .single();

    if (linkError || !shareLink) {
      console.log(`[validate-map-token] Token not found or inactive: ${linkError?.message}`);
      return new Response(
        JSON.stringify({ error: "Invalid or expired link", valid: false }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const link = shareLink as ShareLink;

    // Check expiration
    if (link.expires_at) {
      const expiresAt = new Date(link.expires_at);
      if (expiresAt < new Date()) {
        console.log(`[validate-map-token] Token expired at ${link.expires_at}`);
        return new Response(
          JSON.stringify({ error: "Link has expired", valid: false }),
          { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`[validate-map-token] Token valid, org_id: ${link.org_id}, listing_ids: ${link.listing_ids?.length || 0}, has_snapshot: ${!!link.listing_snapshot}`);

    // PRIORITY 1: Use listing_snapshot if available (frozen data from PDF generation)
    // This ensures PDFs always show the exact same data even after syncs/edits/deletions
    if (link.listing_snapshot && Array.isArray(link.listing_snapshot) && link.listing_snapshot.length > 0) {
      const snapshotListings = link.listing_snapshot as PublicListing[];
      const withCoords = snapshotListings.filter(l => l.latitude && l.longitude).length;
      console.log(`[validate-map-token] Using frozen snapshot: ${snapshotListings.length} listings (${withCoords} with coordinates)`);

      return new Response(
        JSON.stringify({
          valid: true,
          listings: snapshotListings,
          report_type: link.report_type,
          expires_at: link.expires_at,
          org_id: link.org_id,
          snapshot_used: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PRIORITY 2: Fallback to database query for legacy links without snapshots
    console.log(`[validate-map-token] No snapshot found, falling back to database query`);

    let query = supabase
      .from("listings")
      .select(`
        id,
        listing_id,
        address,
        display_address,
        property_name,
        city,
        submarket,
        size_sf,
        clear_height_ft,
        dock_doors,
        drive_in_doors,
        availability_date,
        latitude,
        longitude
      `);

    // If listing_ids are specified, use them (legacy behavior)
    if (link.listing_ids && link.listing_ids.length > 0) {
      query = query.in("listing_id", link.listing_ids);
      console.log(`[validate-map-token] Using explicit listing_id filter: ${link.listing_ids.length} IDs`);
    } else {
      // Fallback: use org_id + filters (for legacy links without listing_ids)
      query = query
        .eq("status", "Active")
        .eq("include_in_issue", true);

      // Scope by org_id to prevent cross-org duplicates
      if (link.org_id) {
        query = query.eq("org_id", link.org_id);
        console.log(`[validate-map-token] Scoping to org: ${link.org_id}`);
      } else if (link.created_by) {
        // Fallback: scope by the user who created the link
        const { data: membership } = await supabase
          .from("org_members")
          .select("org_id")
          .eq("user_id", link.created_by)
          .single();
        
        if (membership?.org_id) {
          query = query.eq("org_id", membership.org_id);
          console.log(`[validate-map-token] Scoping to creator's org: ${membership.org_id}`);
        }
      }

      // Apply filters from share_link if present
      const filters = link.filters || {};
      
      if (filters.minSF && typeof filters.minSF === "number") {
        query = query.gte("size_sf", filters.minSF);
      }
      if (filters.maxSF && typeof filters.maxSF === "number") {
        query = query.lte("size_sf", filters.maxSF);
      }
    }

    // Order by size descending
    query = query.order("size_sf", { ascending: false });

    const { data: listings, error: listingsError } = await query;

    if (listingsError) {
      console.error(`[validate-map-token] Failed to fetch listings: ${listingsError.message}`);
      return new Response(
        JSON.stringify({ error: "Failed to fetch listings", valid: false }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduplicate by listing_id (in case of any remaining duplicates)
    const seenListingIds = new Set<string>();
    const uniqueListings: PublicListing[] = [];
    
    for (const l of (listings || [])) {
      if (!seenListingIds.has(l.listing_id as string)) {
        seenListingIds.add(l.listing_id as string);
        uniqueListings.push({
          id: l.id as string,
          listing_id: l.listing_id as string,
          address: l.address as string,
          display_address: l.display_address as string | null,
          property_name: l.property_name as string | null,
          city: l.city as string,
          submarket: l.submarket as string,
          size_sf: l.size_sf as number,
          clear_height_ft: l.clear_height_ft as number | null,
          dock_doors: l.dock_doors as number | null,
          drive_in_doors: l.drive_in_doors as number | null,
          availability_date: l.availability_date as string | null,
          latitude: l.latitude as number | null,
          longitude: l.longitude as number | null,
        });
      }
    }

    const withCoords = uniqueListings.filter(l => l.latitude && l.longitude).length;
    console.log(`[validate-map-token] Returning ${uniqueListings.length} unique listings (${withCoords} with coordinates)`);

    return new Response(
      JSON.stringify({
        valid: true,
        listings: uniqueListings,
        report_type: link.report_type,
        expires_at: link.expires_at,
        org_id: link.org_id,
        snapshot_used: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error(`[validate-map-token] Error: ${msg}`);
    return new Response(
      JSON.stringify({ error: msg, valid: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
