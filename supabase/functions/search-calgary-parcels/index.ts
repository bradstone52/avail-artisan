import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ParcelResult {
  address: string;
  latitude: number;
  longitude: number;
  roll_number?: string;
  community_name?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, radiusMeters = 500 } = await req.json();

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return new Response(
        JSON.stringify({ error: "latitude and longitude are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[search-calgary-parcels] Searching near ${latitude}, ${longitude} with radius ${radiusMeters}m`);

    // Query Calgary's Parcel Address dataset using Socrata SODA API
    // Dataset: https://data.calgary.ca/Base-Maps/Parcel-Address/s8b3-j88p
    // Note: The geometry column in this dataset is called 'location' not 'the_geom'
    const soqlQuery = `$where=within_circle(location, ${latitude}, ${longitude}, ${radiusMeters})&$limit=50`;
    const url = `https://data.calgary.ca/resource/s8b3-j88p.json?${soqlQuery}`;

    console.log(`[search-calgary-parcels] Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[search-calgary-parcels] Calgary API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: "Failed to query Calgary parcel database", details: errorText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parcels = await response.json();
    console.log(`[search-calgary-parcels] Found ${parcels.length} parcels`);

    // Transform the results to our format
    const results: ParcelResult[] = parcels.map((parcel: any) => {
      // The 'address' field contains the full formatted address like "4639 72 AV SE"
      // Individual fields are: house_number, street_name, street_type, street_quad
      // Use the 'address' field directly if available, otherwise build from components
      let fullAddress = "";
      
      if (parcel.address && parcel.address.trim()) {
        fullAddress = parcel.address.trim();
      } else {
        // Build address from components as fallback
        const parts: string[] = [];
        if (parcel.house_number) parts.push(parcel.house_number);
        if (parcel.house_alpha) parts.push(parcel.house_alpha);
        if (parcel.street_name) parts.push(parcel.street_name);
        if (parcel.street_type) parts.push(parcel.street_type);
        if (parcel.street_quad) parts.push(parcel.street_quad);
        fullAddress = parts.join(" ");
      }

      // Extract coordinates from location if available
      let lat = latitude;
      let lng = longitude;
      
      if (parcel.location && parcel.location.coordinates) {
        // GeoJSON format: [longitude, latitude]
        lng = parcel.location.coordinates[0];
        lat = parcel.location.coordinates[1];
      } else if (parcel.longitude && parcel.latitude) {
        lng = parseFloat(parcel.longitude);
        lat = parseFloat(parcel.latitude);
      }

      return {
        address: fullAddress,
        latitude: lat,
        longitude: lng,
        roll_number: parcel.roll_num || parcel.roll_number || null,
        community_name: parcel.comm_name || parcel.community_name || null,
      };
    }).filter((p: ParcelResult) => p.address && p.address.trim() !== "");

    // Deduplicate by address
    const uniqueAddresses = new Map<string, ParcelResult>();
    for (const parcel of results) {
      if (!uniqueAddresses.has(parcel.address)) {
        uniqueAddresses.set(parcel.address, parcel);
      }
    }

    const uniqueResults = Array.from(uniqueAddresses.values());
    console.log(`[search-calgary-parcels] Returning ${uniqueResults.length} unique parcels`);

    return new Response(
      JSON.stringify({ parcels: uniqueResults }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error(`[search-calgary-parcels] Error: ${msg}`);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
