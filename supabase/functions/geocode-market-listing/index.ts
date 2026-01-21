import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ArcGIS FeatureServer layers (same as Google Sheet code.gs)
const COMMUNITY_LAYERS = [
  'https://services.arcgis.com/xYjDUN35YwdCEcMm/ArcGIS/rest/services/Calgary_Communities_Boundary/FeatureServer/0',
  'https://services.arcgis.com/xYjDUN35YwdCEcMm/ArcGIS/rest/services/Community_Districts/FeatureServer/0'
];
const COMMUNITY_NAME_FIELD = 'NAME';

const CITY_BOUNDARY_LAYER = 
  'https://services.arcgis.com/xYjDUN35YwdCEcMm/ArcGIS/rest/services/Aspect_Chloropleth_WFL1/FeatureServer/1';

// Directional indicators that should always remain uppercase
const DIRECTIONAL_INDICATORS = ['NW', 'NE', 'SW', 'SE', 'N', 'S', 'E', 'W'];

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

/**
 * Geocode an address using Google Geocoding API
 */
async function geocodeWithGoogle(
  address: string, 
  city: string, 
  googleApiKey: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const normalizedAddress = normalizeAddress(address);
    const fullAddress = `${normalizedAddress}, ${city}, AB, Canada`;
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
      const location = data.results[0].geometry.location;
      console.log(`[Geocode] Success: lat=${location.lat}, lng=${location.lng}`);
      return { lat: location.lat, lng: location.lng };
    }
    
    console.log(`[Geocode] No results for: ${fullAddress}`);
    return null;
  } catch (error) {
    console.error(`[Geocode] Error:`, error);
    return null;
  }
}

/**
 * Point-in-ring algorithm (ray casting)
 */
function pointInRing(pt: [number, number], ring: number[][]): boolean {
  const x = pt[0], y = pt[1];
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Check if point is inside a polygon (with holes support)
 */
function pointInPolygon(pt: [number, number], polygon: number[][][]): boolean {
  if (!polygon || !polygon.length) return false;
  // Must be inside outer ring
  if (!pointInRing(pt, polygon[0])) return false;
  // Must not be inside any holes
  for (let h = 1; h < polygon.length; h++) {
    if (pointInRing(pt, polygon[h])) return false;
  }
  return true;
}

/**
 * Check if point is inside any of the polygons
 */
function pointInAnyPolygon(pt: [number, number], polygons: number[][][][]): boolean {
  for (const poly of polygons) {
    if (pointInPolygon(pt, poly)) return true;
  }
  return false;
}

interface GeoJSONFeature {
  type: string;
  properties: Record<string, unknown>;
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
}

interface GeoJSONFeatureCollection {
  type: string;
  features: GeoJSONFeature[];
}

/**
 * Find the feature that contains the given point
 */
function findContainingFeature(pt: [number, number], features: GeoJSONFeature[]): GeoJSONFeature | null {
  for (const f of features) {
    const g = f?.geometry;
    if (!g) continue;
    
    if (g.type === 'Polygon') {
      if (pointInPolygon(pt, g.coordinates as number[][][])) return f;
    } else if (g.type === 'MultiPolygon') {
      for (const poly of g.coordinates as number[][][][]) {
        if (pointInPolygon(pt, poly)) return f;
      }
    }
  }
  return null;
}

/**
 * Convert GeoJSON to array of polygons
 */
function geojsonToPolys(gj: GeoJSONFeatureCollection): number[][][][] {
  const polys: number[][][][] = [];
  for (const f of (gj.features || [])) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === 'Polygon') {
      polys.push(g.coordinates as number[][][]);
    } else if (g.type === 'MultiPolygon') {
      for (const p of g.coordinates as number[][][][]) {
        polys.push(p);
      }
    }
  }
  return polys;
}

/**
 * Fetch community boundaries from ArcGIS
 */
async function fetchCommunityBoundaries(): Promise<GeoJSONFeature[]> {
  for (const base of COMMUNITY_LAYERS) {
    const url = `${base}/query?f=geojson&where=1%3D1&outSR=4326&returnGeometry=true&outFields=${encodeURIComponent(COMMUNITY_NAME_FIELD)}`;
    
    try {
      console.log(`[ArcGIS] Fetching communities from: ${base}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`[ArcGIS] Communities HTTP ${response.status}`);
        continue;
      }
      
      const gj = await response.json() as GeoJSONFeatureCollection;
      
      if (gj && gj.type === 'FeatureCollection' && gj.features?.length) {
        console.log(`[ArcGIS] Loaded ${gj.features.length} community features`);
        return gj.features;
      }
    } catch (error) {
      console.error(`[ArcGIS] Communities fetch error:`, error);
    }
  }
  
  throw new Error('Failed to download Community polygons from ArcGIS');
}

/**
 * Fetch Calgary city boundary from ArcGIS
 */
async function fetchCityBoundary(): Promise<number[][][][]> {
  const url = `${CITY_BOUNDARY_LAYER}/query?f=geojson&where=1%3D1&outSR=4326&returnGeometry=true&outFields=city_name`;
  
  console.log(`[ArcGIS] Fetching city boundary`);
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`City boundary HTTP ${response.status}`);
  }
  
  const gj = await response.json() as GeoJSONFeatureCollection;
  
  if (!gj || gj.type !== 'FeatureCollection' || !gj.features?.length) {
    throw new Error('City boundary returned no features');
  }
  
  console.log(`[ArcGIS] Loaded city boundary with ${gj.features.length} features`);
  return geojsonToPolys(gj);
}

/**
 * Determine submarket (community name) using ArcGIS polygon lookup
 */
async function determineSubmarket(lat: number, lng: number): Promise<string | null> {
  const pt: [number, number] = [lng, lat]; // GeoJSON uses [lng, lat]
  
  try {
    // First check if point is inside Calgary city boundary
    const cityPolys = await fetchCityBoundary();
    const insideCity = pointInAnyPolygon(pt, cityPolys);
    
    if (!insideCity) {
      console.log(`[Submarket] Point is outside Calgary city boundary`);
      return null; // Outside Calgary - leave blank
    }
    
    // Find the community that contains this point
    const communities = await fetchCommunityBoundaries();
    const feature = findContainingFeature(pt, communities);
    
    if (feature) {
      const name = String(feature.properties?.[COMMUNITY_NAME_FIELD] || '').trim();
      console.log(`[Submarket] Found community: ${name}`);
      return name || 'No community match';
    }
    
    console.log(`[Submarket] Inside Calgary but no community match`);
    return 'No community match';
    
  } catch (error) {
    console.error(`[Submarket] Error:`, error);
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

    // Check if already has valid coordinates and submarket
    if (listing.latitude && listing.longitude && listing.submarket && 
        listing.submarket !== 'Pending' && listing.submarket !== '') {
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

    // Determine submarket using ArcGIS polygon lookup
    const submarket = await determineSubmarket(geocodeResult.lat, geocodeResult.lng);

    console.log(`[Geocode Market Listing] Assigned submarket: ${submarket || '(outside Calgary)'}`);

    // Update the listing
    const { error: updateError } = await adminClient
      .from('market_listings')
      .update({
        latitude: geocodeResult.lat,
        longitude: geocodeResult.lng,
        submarket: submarket || '', // Empty string if outside Calgary
        geocoded_at: new Date().toISOString(),
        geocode_source: 'google',
      })
      .eq('id', listing.id);

    if (updateError) {
      console.error('[Geocode Market Listing] Update failed:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update listing' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      });
    }

    console.log('[Geocode Market Listing] Success!');

    return new Response(JSON.stringify({ 
      success: true, 
      geocoded: true,
      submarket_assigned: !!submarket,
      latitude: geocodeResult.lat,
      longitude: geocodeResult.lng,
      submarket: submarket || '',
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
