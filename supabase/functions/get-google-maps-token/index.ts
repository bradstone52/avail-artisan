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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const googleMapsApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    
    console.log("[get-google-maps-token] Request received");
    console.log("[get-google-maps-token] GOOGLE_MAPS_API_KEY present:", !!googleMapsApiKey);

    if (!googleMapsApiKey) {
      console.error("[get-google-maps-token] GOOGLE_MAPS_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Google Maps API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    let body: { token?: string; authenticated?: boolean } = {};
    if (req.method === "POST") {
      body = await req.json().catch(() => ({}));
    }

    const shareToken = body.token;
    const isAuthenticatedRequest = body.authenticated === true;

    // Option 1: Authenticated user request (no share token needed)
    if (isAuthenticatedRequest) {
      console.log("[get-google-maps-token] Authenticated request mode");
      
      // Validate the user's JWT from the Authorization header
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        console.log("[get-google-maps-token] Missing Authorization header for authenticated request");
        return new Response(
          JSON.stringify({ error: "Authorization required" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Use getClaims() to validate the JWT - this works with Supabase's signing-keys system
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: { Authorization: authHeader },
        },
      });

      const token = authHeader.replace("Bearer ", "");
      const { data, error: claimsError } = await supabase.auth.getClaims(token);
      
      if (claimsError || !data?.claims) {
        console.log("[get-google-maps-token] Invalid or expired user token:", claimsError?.message);
        return new Response(
          JSON.stringify({ error: "Invalid or expired session" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = data.claims.sub as string;
      console.log(`[get-google-maps-token] Authenticated user: ${userId.substring(0, 8)}...`);
      console.log("[get-google-maps-token] Returning Google Maps API key for authenticated user");

      return new Response(
        JSON.stringify({ apiKey: googleMapsApiKey }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Option 2: Public share token validation
    if (!shareToken) {
      console.log("[get-google-maps-token] Missing share token");
      return new Response(
        JSON.stringify({ error: "Missing share token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[get-google-maps-token] Validating share token: ${shareToken.substring(0, 8)}...`);

    // Validate the share token before returning the API key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: shareLink, error: linkError } = await supabase
      .from("share_links")
      .select("id, token, is_active, expires_at")
      .eq("token", shareToken)
      .eq("is_active", true)
      .single();

    if (linkError || !shareLink) {
      console.log(`[get-google-maps-token] Invalid share token: ${linkError?.message || "not found"}`);
      return new Response(
        JSON.stringify({ error: "Invalid or expired share link" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    if (shareLink.expires_at) {
      const expiresAt = new Date(shareLink.expires_at);
      if (expiresAt < new Date()) {
        console.log(`[get-google-maps-token] Share link expired at ${shareLink.expires_at}`);
        return new Response(
          JSON.stringify({ error: "Share link has expired" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("[get-google-maps-token] Share token valid, returning Google Maps API key");

    return new Response(
      JSON.stringify({ apiKey: googleMapsApiKey }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error(`[get-google-maps-token] Error: ${msg}`);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
