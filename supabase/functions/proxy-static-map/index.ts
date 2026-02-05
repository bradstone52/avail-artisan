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
 
     // Build Google Static Maps URL
     const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&scale=${scale}&maptype=${maptype}&markers=color:red%7C${lat},${lng}&key=${googleMapsApiKey}`;
 
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