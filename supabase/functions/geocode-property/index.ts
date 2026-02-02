import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(str: string): boolean {
  return typeof str === 'string' && UUID_REGEX.test(str);
}

// ArcGIS FeatureServer layers (same as geocode-market-listing)
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
  if (!pointInRing(pt, polygon[0])) return false;
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
      return name || null;
    }
    
    console.log(`[Submarket] Inside Calgary but no community match`);
    return null;
    
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

    // Parse request body
    let body: { propertyId?: unknown; address?: unknown; city?: unknown };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { propertyId, address, city } = body;

    // Validate inputs
    if (!propertyId || typeof propertyId !== 'string' || !isValidUUID(propertyId)) {
      return new Response(JSON.stringify({ error: 'Valid property ID is required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (!address || typeof address !== 'string') {
      return new Response(JSON.stringify({ error: 'Address is required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const cityStr = typeof city === 'string' ? city : '';

    // Only process Calgary properties for submarket assignment
    const isCalgary = cityStr.toLowerCase().includes('calgary');
    if (!isCalgary) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Submarket auto-assignment only available for Calgary properties',
        submarket: null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get Google API key
    const googleApiKey = Deno.env.get('GOOGLE_GEOCODING_API_KEY') || Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!googleApiKey) {
      return new Response(JSON.stringify({ error: 'Google API key not configured' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Use service role for updates
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    // Geocode the address
    const coords = await geocodeWithGoogle(address, cityStr, googleApiKey);
    
    if (!coords) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Could not geocode address',
        submarket: null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Determine submarket from coordinates
    const submarket = await determineSubmarket(coords.lat, coords.lng);

    // Update property with coordinates and submarket
    const updateData: Record<string, unknown> = {
      latitude: coords.lat,
      longitude: coords.lng,
      geocoded_at: new Date().toISOString(),
      geocode_source: 'google'
    };

    if (submarket) {
      updateData.submarket = submarket;
    }

    const { error: updateError } = await adminSupabase
      .from('properties')
      .update(updateData)
      .eq('id', propertyId);

    if (updateError) {
      console.error('Error updating property:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update property' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      latitude: coords.lat,
      longitude: coords.lng,
      submarket: submarket
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Error in geocode-property:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
