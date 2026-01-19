import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_GEOCODE_PER_RUN = 50;

interface Listing {
  id: string;
  address: string;
  city: string | null;
}

interface GeocodedResult {
  id: string;
  latitude: number;
  longitude: number;
}

// Directional indicators that should always remain uppercase
const DIRECTIONAL_INDICATORS = ['NW', 'NE', 'SW', 'SE', 'N', 'S', 'E', 'W'];

/**
 * Convert a string to title case, preserving directional indicators as uppercase.
 * "5555 69 AVENUE SE" → "5555 69 Avenue SE"
 */
function toTitleCase(str: string): string {
  return str.split(' ').map(word => {
    const upperWord = word.toUpperCase();
    // Keep directional indicators uppercase
    if (DIRECTIONAL_INDICATORS.includes(upperWord)) {
      return upperWord;
    }
    // Keep numbers as-is
    if (/^\d+$/.test(word)) {
      return word;
    }
    // Title case: first letter uppercase, rest lowercase
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

/**
 * Normalize address strings to improve geocoding accuracy.
 * Handles common formatting issues like:
 * - "5555 - 69th Ave SE" → "5555 69 Ave SE"
 * - "5555 69 AVENUE SE" → "5555 69 Avenue SE"
 * - Removes ordinal suffixes (st, nd, rd, th) from street numbers
 * - Normalizes separators and extra spaces
 * - Converts ALL CAPS to title case while preserving directional indicators
 */
function normalizeAddress(address: string): string {
  let normalized = address;
  
  // First, convert to title case (handles ALL CAPS addresses)
  normalized = toTitleCase(normalized);
  
  // Remove " - " between street number and street name (e.g., "5555 - 69th" → "5555 69th")
  normalized = normalized.replace(/(\d+)\s*-\s+(\d)/g, '$1 $2');
  
  // Remove ordinal suffixes from street numbers (e.g., "69th" → "69", "1st" → "1", "2nd" → "2", "3rd" → "3")
  normalized = normalized.replace(/\b(\d+)(st|nd|rd|th)\b/gi, '$1');
  
  // Normalize common abbreviations (apply after title case to ensure consistent casing)
  normalized = normalized.replace(/\bAvenue\b/gi, 'Ave');
  normalized = normalized.replace(/\bStreet\b/gi, 'St');
  normalized = normalized.replace(/\bDrive\b/gi, 'Dr');
  normalized = normalized.replace(/\bRoad\b/gi, 'Rd');
  normalized = normalized.replace(/\bBoulevard\b/gi, 'Blvd');
  normalized = normalized.replace(/\bCrescent\b/gi, 'Cres');
  normalized = normalized.replace(/\bCourt\b/gi, 'Ct');
  normalized = normalized.replace(/\bPlace\b/gi, 'Pl');
  normalized = normalized.replace(/\bCircle\b/gi, 'Cir');
  normalized = normalized.replace(/\bHighway\b/gi, 'Hwy');
  normalized = normalized.replace(/\bTrail\b/gi, 'Tr');
  normalized = normalized.replace(/\bLane\b/gi, 'Ln');
  normalized = normalized.replace(/\bTerrace\b/gi, 'Ter');
  normalized = normalized.replace(/\bParkway\b/gi, 'Pkwy');
  normalized = normalized.replace(/\bWay\b/gi, 'Way');
  
  // Remove extra spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  console.log(`Address normalized: "${address}" → "${normalized}"`);
  
  return normalized;
}

/**
 * Geocode an address using Google's Geocoding API.
 * Returns lat/lng coordinates or null if geocoding fails.
 */
async function geocodeWithGoogle(
  address: string, 
  city: string | null, 
  googleApiKey: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    // Normalize the address before geocoding
    const normalizedAddress = normalizeAddress(address);
    const fullAddress = city ? `${normalizedAddress}, ${city}, Canada` : `${normalizedAddress}, Canada`;
    const encodedAddress = encodeURIComponent(fullAddress);
    
    // Use Google Geocoding API with region bias for Canada
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&region=ca&key=${googleApiKey}`;
    
    console.log(`Geocoding with Google: "${fullAddress}"`);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Google Geocoding API error for "${fullAddress}": ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      console.log(`Google geocoded "${fullAddress}" → lat: ${location.lat}, lng: ${location.lng}`);
      return { lat: location.lat, lng: location.lng };
    }
    
    if (data.status === 'ZERO_RESULTS') {
      console.log(`No Google geocoding results for: ${fullAddress}`);
    } else if (data.status !== 'OK') {
      console.error(`Google Geocoding API status: ${data.status}, error: ${data.error_message || 'none'}`);
    }
    
    return null;
  } catch (error) {
    console.error(`Google geocoding error for "${address}":`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify user is authenticated
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Use Google Geocoding API
    const googleApiKey = Deno.env.get('GOOGLE_GEOCODING_API_KEY');
    if (!googleApiKey) {
      console.error('GOOGLE_GEOCODING_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Geocoding not configured' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Get listings missing coordinates (exclude manually set ones)
    // Note: neq doesn't work with NULL values, so we use or() to include NULL geocode_source
    const { data: listingsToGeocode, error: fetchError } = await supabaseAdmin
      .from('listings')
      .select('id, address, city')
      .or('latitude.is.null,longitude.is.null,latitude.eq.0,longitude.eq.0')
      .or('geocode_source.is.null,geocode_source.neq.manual')
      .limit(MAX_GEOCODE_PER_RUN);

    if (fetchError) {
      console.error('Error fetching listings:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch listings' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (!listingsToGeocode || listingsToGeocode.length === 0) {
      console.log('No listings need geocoding');
      return new Response(JSON.stringify({ 
        success: true, 
        geocoded: 0, 
        message: 'All listings already have coordinates' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Geocoding ${listingsToGeocode.length} listings with Google...`);

    const results: GeocodedResult[] = [];
    let successCount = 0;
    let failCount = 0;

    for (const listing of listingsToGeocode as Listing[]) {
      const coords = await geocodeWithGoogle(listing.address, listing.city, googleApiKey);
      
      if (coords) {
        results.push({
          id: listing.id,
          latitude: coords.lat,
          longitude: coords.lng,
        });
        successCount++;
      } else {
        failCount++;
      }
      
      // Small delay to avoid rate limiting (Google allows 50 QPS)
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Update all geocoded listings
    for (const result of results) {
      const { error: updateError } = await supabaseAdmin
        .from('listings')
        .update({
          latitude: result.latitude,
          longitude: result.longitude,
          geocode_source: 'google',
          geocoded_at: new Date().toISOString(),
        })
        .eq('id', result.id);

      if (updateError) {
        console.error(`Failed to update listing ${result.id}:`, updateError);
      }
    }

    console.log(`Geocoding complete: ${successCount} succeeded, ${failCount} failed`);

    return new Response(JSON.stringify({ 
      success: true, 
      geocoded: successCount,
      failed: failCount,
      remaining: listingsToGeocode.length > MAX_GEOCODE_PER_RUN,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in geocode-listings:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
