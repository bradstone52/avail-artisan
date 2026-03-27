import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const googleMapsApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");

    if (!googleMapsApiKey) {
      return new Response(
        JSON.stringify({ error: "Google Maps API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !data?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request params
    const url = new URL(req.url);
    const lat = url.searchParams.get("lat");
    const lng = url.searchParams.get("lng");
    const markerLat = url.searchParams.get("markerLat") || lat;
    const markerLng = url.searchParams.get("markerLng") || lng;
    const zoom = url.searchParams.get("zoom") || "13";
    const size = url.searchParams.get("size") || "900x500";
    const scale = url.searchParams.get("scale") || "2";
    const maptype = url.searchParams.get("maptype") || "roadmap";
    const accent = url.searchParams.get("accentColor") || "0f2044";

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: "Missing lat or lng parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const styles = [
      // Background — very light warm gray
      "feature:landscape|element:geometry|color:0xF5F4F0",
      "feature:landscape.natural|element:geometry|color:0xEAE8E3",
      // Water — muted steel blue
      "feature:water|element:geometry|color:0xC9D8E8",
      "feature:water|element:labels|visibility:off",
      // Hide all points of interest
      "feature:poi|visibility:off",
      "feature:transit|visibility:off",
      // Hide administrative labels except major city names
      "feature:administrative.neighborhood|visibility:off",
      "feature:administrative.land_parcel|visibility:off",
      // Local roads — white fill, very light gray stroke
      "feature:road.local|element:geometry.fill|color:0xFFFFFF",
      "feature:road.local|element:geometry.stroke|color:0xD8D4CC|weight:0.5",
      "feature:road.local|element:labels|visibility:off",
      // Arterial roads — light gray fill, subtle stroke
      "feature:road.arterial|element:geometry.fill|color:0xE8E4DC",
      "feature:road.arterial|element:geometry.stroke|color:0xC8C2B8|weight:0.5",
      "feature:road.arterial|element:labels.text.fill|color:0x4A4A4A",
      "feature:road.arterial|element:labels.text.stroke|color:0xFFFFFF|weight:3",
      "feature:road.arterial|element:labels.icon|visibility:off",
      // Highways — medium gray, clearly readable but not garish
      "feature:road.highway|element:geometry.fill|color:0xD4CFC7",
      "feature:road.highway|element:geometry.stroke|color:0xB0A89E|weight:1",
      "feature:road.highway|element:labels.text.fill|color:0x2A2A2A",
      "feature:road.highway|element:labels.text.stroke|color:0xFFFFFF|weight:3",
      "feature:road.highway|element:labels.icon|visibility:off",
      // Buildings — slightly warm light gray
      "feature:building|element:geometry.fill|color:0xE2DED8",
      "feature:building|element:geometry.stroke|color:0xCCC8C0|weight:0.3",
    ];

    const styleParams = styles.map(s => `style=${encodeURIComponent(s)}`).join("&");

    // Marker: solid circle in the accent color — professional, branded
    const markerStyle = `color:0x${accent}|size:mid|label: `;

    // Build Google Static Maps URL with custom styling and marker
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&scale=${scale}&maptype=${maptype}&markers=${markerStyle}%7C${markerLat},${markerLng}&${styleParams}&key=${googleMapsApiKey}`;

    // Fetch the image from Google
    const mapResponse = await fetch(staticMapUrl);
    
    if (!mapResponse.ok) {
      console.error("Static map fetch failed:", mapResponse.status, await mapResponse.text());
      return new Response(
        JSON.stringify({ error: "Failed to fetch map image" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return the image with proper headers
    const imageData = await mapResponse.arrayBuffer();
    const contentType = mapResponse.headers.get("Content-Type") || "image/png";

    return new Response(imageData, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error(`[proxy-static-map] Error: ${msg}`);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
