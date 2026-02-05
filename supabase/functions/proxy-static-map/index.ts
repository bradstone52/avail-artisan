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
     const zoom = url.searchParams.get("zoom") || "14";
     const size = url.searchParams.get("size") || "800x450";
     const scale = url.searchParams.get("scale") || "2";
     const maptype = url.searchParams.get("maptype") || "roadmap";
 
     if (!lat || !lng) {
       return new Response(
         JSON.stringify({ error: "Missing lat or lng parameters" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
      // "Poppy" color scheme: bold, high-contrast roads with clean look
      const styles = [
        // Hide all POI (points of interest)
        "feature:poi|visibility:off",
        "feature:transit|element:labels|visibility:off",
        // Muted background
        "feature:landscape|element:geometry|color:0xf5f5f0",
        "feature:water|element:geometry|color:0xc9e4f0",
        // Local roads - clean white with bold dark stroke
        "feature:road.local|element:geometry.fill|color:0xffffff",
        "feature:road.local|element:geometry.stroke|color:0x444444|weight:1.5",
        // Arterial roads - warm accent
        "feature:road.arterial|element:geometry.fill|color:0xffd866",
        "feature:road.arterial|element:geometry.stroke|color:0xcc8800|weight:1.5",
        // Highways - bold coral/orange
        "feature:road.highway|element:geometry.fill|color:0xff7744",
        "feature:road.highway|element:geometry.stroke|color:0xcc4400|weight:2",
        // Road labels - high contrast
        "feature:road|element:labels.text.fill|color:0x111111",
        "feature:road|element:labels.text.stroke|color:0xffffff|weight:4",
        // Administrative labels subtle
        "feature:administrative|element:labels.text.fill|color:0x666666",
      ];
      
      const styleParams = styles.map(s => `style=${encodeURIComponent(s)}`).join("&");

      // Custom marker - blue color, larger size with star label
      // Using a custom icon URL for a blue star
      // Using Chart API to create a blue and yellow bullseye marker
      const customIconUrl = "https://chart.googleapis.com/chart?chst=d_map_spin&chld=1.2|0|0066FF|14|b|●";
      const markerStyle = `icon:${encodeURIComponent(customIconUrl)}`;
      
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
         "Cache-Control": "public, max-age=86400", // Cache for 1 day
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