import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Directional indicators that should always remain uppercase
const DIRECTIONAL_INDICATORS = ['NW', 'NE', 'SW', 'SE', 'N', 'S', 'E', 'W'];

// Calgary submarket mappings based on community districts
// See: https://data.calgary.ca/Base-Maps/Community-District-Boundaries/surr-xmvs
const CALGARY_SUBMARKET_MAPPING: Record<string, string> = {
  // Northeast quadrant communities
  'SADDLE RIDGE': 'NE Industrial',
  'SADDLE RIDGE INDUSTRIAL': 'NE Industrial',
  'STONEY 1': 'NE Industrial',
  'STONEY 2': 'NE Industrial',
  'STONEY INDUSTRIAL': 'NE Industrial',
  'SKYVIEW RANCH': 'NE Industrial',
  'REDSTONE': 'NE Industrial',
  'CORNERSTONE': 'NE Industrial',
  'CITYSCAPE': 'NE Industrial',
  'HOMESTEAD': 'NE Industrial',
  
  // Southeast quadrant communities  
  'FOOTHILLS INDUSTRIAL': 'SE Industrial',
  'STARFIELD': 'SE Industrial',
  'DOUGLAS GLEN': 'SE Industrial',
  'DOUGLASDALE/GLEN': 'SE Industrial',
  'QUARRY PARK': 'SE Industrial',
  'RIVERBEND': 'SE Industrial',
  'OGDEN': 'SE Industrial',
  'LYNNWOOD': 'SE Industrial',
  'MILLICAN': 'SE Industrial',
  'GREAT PLAINS': 'SE Industrial',
  'DEERFOOT BUSINESS CENTRE': 'SE Industrial',
  'EAST SHEPARD': 'SE Industrial',
  'SHEPARD INDUSTRIAL': 'SE Industrial',
  'SOUTH FOOTHILLS': 'SE Industrial',
  
  // South quadrant communities
  'SOUTH CALGARY': 'South',
  'MANCHESTER': 'South',
  'MANCHESTER INDUSTRIAL': 'South',
  'FAIRVIEW': 'South',
  'CHINOOK PARK': 'South',
  'KINGSLAND': 'South',
  'SHAWNESSY': 'South',
  'MIDNAPORE': 'South',
  'SUNDANCE': 'South',
  'CHAPARRAL': 'South',
  'CRANSTON': 'South',
  'AUBURN BAY': 'South',
  'MAHOGANY': 'South',
  'SETON': 'South',
  
  // Southwest quadrant communities
  'CURRIE BARRACKS': 'SW Industrial',
  'GLAMORGAN': 'SW Industrial',
  'GLENBROOK': 'SW Industrial',
  'KILLARNEY/GLENGARRY': 'SW Industrial',
  'ROSSCARROCK': 'SW Industrial',
  'WESTGATE': 'SW Industrial',
  'ASPEN WOODS': 'SW Industrial',
  'SPRINGBANK HILL': 'SW Industrial',
  'SIGNAL HILL': 'SW Industrial',
  'STRATHCONA PARK': 'SW Industrial',
  'COACH HILL': 'SW Industrial',
  'PATTERSON': 'SW Industrial',
  'DISCOVERY RIDGE': 'SW Industrial',
  
  // Northwest quadrant communities
  'DALHOUSIE': 'NW Industrial',
  'VARSITY': 'NW Industrial',
  'BRENTWOOD': 'NW Industrial',
  'UNIVERSITY HEIGHTS': 'NW Industrial',
  'BOWNESS': 'NW Industrial',
  'GREENWOOD/GREENBRIAR': 'NW Industrial',
  'ARBOUR LAKE': 'NW Industrial',
  'CITADEL': 'NW Industrial',
  'HAWKWOOD': 'NW Industrial',
  'ROYAL OAK': 'NW Industrial',
  'ROCKY RIDGE': 'NW Industrial',
  'TUSCANY': 'NW Industrial',
  'EVANSTON': 'NW Industrial',
  'KINCORA': 'NW Industrial',
  'SAGE HILL': 'NW Industrial',
  'SHERWOOD': 'NW Industrial',
  'NOLAN HILL': 'NW Industrial',
  'LIVINGSTON': 'NW Industrial',
  
  // Central/Downtown
  'DOWNTOWN COMMERCIAL CORE': 'Central',
  'BELTLINE': 'Central',
  'VICTORIA PARK': 'Central',
  'CHINATOWN': 'Central',
  'EAU CLAIRE': 'Central',
  'WEST END': 'Central',
  'SUNALTA': 'Central',
  'MISSION': 'Central',
  'CLIFF BUNGALOW': 'Central',
  'ERLTON': 'Central',
  'INGLEWOOD': 'Central',
  'RAMSAY': 'Central',
  'BRIDGELAND/RIVERSIDE': 'Central',
  'SUNNYSIDE': 'Central',
  'HILLHURST': 'Central',
  'KENSINGTON': 'Central',
  'CAPITOL HILL': 'Central',
  'MOUNT PLEASANT': 'Central',
  'TUXEDO PARK': 'Central',
  'RENFREW': 'Central',
  'CRESCENT HEIGHTS': 'Central',
  'WINSTON HEIGHTS/MOUNTVIEW': 'Central',
  
  // Major industrial areas - explicit mappings
  'ALYTH/BONNYBROOK': 'SE Industrial',
  'HIGHFIELD': 'SE Industrial',
  'BONNYBROOK': 'SE Industrial',
  'BURNS INDUSTRIAL': 'SE Industrial',
  'EAST FAIRVIEW INDUSTRIAL': 'SE Industrial',
  'FAIRVIEW INDUSTRIAL': 'SE Industrial',
  'FRANKLIN': 'SE Industrial',
  'GLENDEER BUSINESS PARK': 'SE Industrial',
  'HASKAYNE': 'NW Industrial',
  'HORIZON': 'NE Industrial',
  'HUNT INDUSTRIAL': 'SE Industrial',
  'MAYLAND HEIGHTS': 'NE Industrial',
  'MAYLAND': 'NE Industrial',
  'MERIDIAN': 'NE Industrial',
  'PEGASUS': 'NE Industrial',
  'POINT TROTTER INDUSTRIAL': 'SE Industrial',
  'SUNRIDGE': 'NE Industrial',
  'VISTA HEIGHTS': 'NE Industrial',
};

function toTitleCase(str: string): string {
  return str.split(' ').map(word => {
    const upperWord = word.toUpperCase();
    if (DIRECTIONAL_INDICATORS.includes(upperWord)) {
      return upperWord;
    }
    if (/^\d+$/.test(word)) {
      return word;
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

function normalizeAddress(address: string): string {
  let normalized = address;
  normalized = toTitleCase(normalized);
  normalized = normalized.replace(/(\d+)\s*-\s+(\d)/g, '$1 $2');
  normalized = normalized.replace(/\b(\d+)(st|nd|rd|th)\b/gi, '$1');
  normalized = normalized.replace(/\s+/g, ' ').trim();
  return normalized;
}

interface GeocodeResult {
  lat: number;
  lng: number;
  neighborhood?: string;
}

/**
 * Geocode an address using Google Geocoding API and extract neighborhood info
 */
async function geocodeWithGoogle(
  address: string, 
  city: string, 
  googleApiKey: string
): Promise<GeocodeResult | null> {
  try {
    const normalizedAddress = normalizeAddress(address);
    const fullAddress = `${normalizedAddress}, ${city}, Alberta, Canada`;
    const encodedAddress = encodeURIComponent(fullAddress);
    
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&region=ca&key=${googleApiKey}`;
    
    console.log(`[Geocode] Geocoding: "${fullAddress}"`);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[Geocode] Google API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry.location;
      
      // Extract neighborhood from address components
      let neighborhood: string | undefined;
      for (const component of result.address_components || []) {
        if (component.types.includes('neighborhood') || component.types.includes('sublocality')) {
          neighborhood = component.long_name.toUpperCase();
          break;
        }
        // Calgary uses "locality" subdivisions sometimes
        if (component.types.includes('sublocality_level_1')) {
          neighborhood = component.long_name.toUpperCase();
          break;
        }
      }
      
      console.log(`[Geocode] Success: lat=${location.lat}, lng=${location.lng}, neighborhood=${neighborhood || 'none'}`);
      return { lat: location.lat, lng: location.lng, neighborhood };
    }
    
    console.log(`[Geocode] No results for: ${fullAddress}`);
    return null;
  } catch (error) {
    console.error(`[Geocode] Error:`, error);
    return null;
  }
}

/**
 * Determine submarket based on coordinates using quadrant logic for Calgary
 */
function determineSubmarketFromCoords(lat: number, lng: number, neighborhood?: string): string {
  // Check if we have a direct neighborhood mapping
  if (neighborhood) {
    const mapped = CALGARY_SUBMARKET_MAPPING[neighborhood];
    if (mapped) {
      console.log(`[Submarket] Matched neighborhood "${neighborhood}" to "${mapped}"`);
      return mapped;
    }
  }
  
  // Calgary city center coordinates (approximately Centre St & 17 Ave)
  const CALGARY_CENTER_LAT = 51.0447;
  const CALGARY_CENTER_LNG = -114.0719;
  
  // Industrial areas are generally:
  // - NE: East of Deerfoot Trail (roughly -114.0) and north of 16 Ave
  // - SE: East of Deerfoot and south of 17 Ave
  // - SW: West of downtown core, south of Bow River
  // - NW: West of downtown, north of Bow
  
  const isNorth = lat > CALGARY_CENTER_LAT;
  const isEast = lng > CALGARY_CENTER_LNG;
  
  if (isNorth && isEast) {
    return 'NE Industrial';
  } else if (!isNorth && isEast) {
    return 'SE Industrial';
  } else if (isNorth && !isEast) {
    return 'NW Industrial';
  } else {
    return 'SW Industrial';
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const body = await req.json();
    const { listingId } = body;
    
    if (!listingId) {
      return new Response(JSON.stringify({ error: 'listingId is required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log(`[Geocode Market Listing] Processing listing: ${listingId}`);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch the listing
    const { data: listing, error: fetchError } = await adminClient
      .from('market_listings')
      .select('id, listing_id, address, city, submarket, latitude, longitude')
      .eq('listing_id', listingId)
      .single();

    if (fetchError || !listing) {
      console.error('[Geocode Market Listing] Listing not found:', fetchError);
      return new Response(JSON.stringify({ error: 'Listing not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Only process Calgary listings for auto-submarket assignment
    if (listing.city !== 'Calgary') {
      console.log('[Geocode Market Listing] Not a Calgary listing, skipping submarket assignment');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Non-Calgary listing, no submarket assignment needed',
        geocoded: false,
        submarket_assigned: false,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if already has valid coordinates
    if (listing.latitude && listing.longitude && listing.submarket && listing.submarket !== 'Pending') {
      console.log('[Geocode Market Listing] Already geocoded and has submarket');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Listing already has coordinates and submarket',
        geocoded: false,
        submarket_assigned: false,
        existing_submarket: listing.submarket,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Google API key
    const googleApiKey = Deno.env.get('GOOGLE_GEOCODING_API_KEY');
    if (!googleApiKey) {
      console.error('[Geocode Market Listing] GOOGLE_GEOCODING_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Geocoding not configured' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Geocode the address
    const geocodeResult = await geocodeWithGoogle(listing.address, listing.city, googleApiKey);
    
    if (!geocodeResult) {
      console.log('[Geocode Market Listing] Geocoding failed');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Could not geocode address',
        geocoded: false,
        submarket_assigned: false,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine submarket from coordinates and neighborhood
    const submarket = determineSubmarketFromCoords(
      geocodeResult.lat, 
      geocodeResult.lng, 
      geocodeResult.neighborhood
    );

    console.log(`[Geocode Market Listing] Assigned submarket: ${submarket}`);

    // Update the listing
    const { error: updateError } = await adminClient
      .from('market_listings')
      .update({
        latitude: geocodeResult.lat,
        longitude: geocodeResult.lng,
        submarket: submarket,
        geocoded_at: new Date().toISOString(),
        geocode_source: 'google',
      })
      .eq('id', listing.id);

    if (updateError) {
      console.error('[Geocode Market Listing] Update failed:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update listing' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('[Geocode Market Listing] Success!');

    return new Response(JSON.stringify({ 
      success: true, 
      geocoded: true,
      submarket_assigned: true,
      latitude: geocodeResult.lat,
      longitude: geocodeResult.lng,
      submarket: submarket,
      neighborhood: geocodeResult.neighborhood,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[Geocode Market Listing] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
