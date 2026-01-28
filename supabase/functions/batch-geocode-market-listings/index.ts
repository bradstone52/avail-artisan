import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
    
    return null;
  } catch (error) {
    console.error(`[Geocode] Error:`, error);
    return null;
  }
}

// Point-in-ring algorithm (ray casting)
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

function pointInPolygon(pt: [number, number], polygon: number[][][]): boolean {
  if (!polygon || !polygon.length) return false;
  if (!pointInRing(pt, polygon[0])) return false;
  for (let h = 1; h < polygon.length; h++) {
    if (pointInRing(pt, polygon[h])) return false;
  }
  return true;
}

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

const COMMUNITY_LAYERS = [
  'https://services.arcgis.com/xYjDUN35YwdCEcMm/ArcGIS/rest/services/Calgary_Communities_Boundary/FeatureServer/0',
  'https://services.arcgis.com/xYjDUN35YwdCEcMm/ArcGIS/rest/services/Community_Districts/FeatureServer/0'
];
const COMMUNITY_NAME_FIELD = 'NAME';
const CITY_BOUNDARY_LAYER = 
  'https://services.arcgis.com/xYjDUN35YwdCEcMm/ArcGIS/rest/services/Aspect_Chloropleth_WFL1/FeatureServer/1';

let cachedCommunities: GeoJSONFeature[] | null = null;
let cachedCityPolys: number[][][][] | null = null;

async function fetchCommunityBoundaries(): Promise<GeoJSONFeature[]> {
  if (cachedCommunities) return cachedCommunities;
  
  for (const base of COMMUNITY_LAYERS) {
    const url = `${base}/query?f=geojson&where=1%3D1&outSR=4326&returnGeometry=true&outFields=${encodeURIComponent(COMMUNITY_NAME_FIELD)}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      
      const gj = await response.json() as GeoJSONFeatureCollection;
      
      if (gj && gj.type === 'FeatureCollection' && gj.features?.length) {
        console.log(`[ArcGIS] Loaded ${gj.features.length} community features`);
        cachedCommunities = gj.features;
        return gj.features;
      }
    } catch (error) {
      console.error(`[ArcGIS] Communities fetch error:`, error);
    }
  }
  
  throw new Error('Failed to download Community polygons from ArcGIS');
}

async function fetchCityBoundary(): Promise<number[][][][]> {
  if (cachedCityPolys) return cachedCityPolys;
  
  const url = `${CITY_BOUNDARY_LAYER}/query?f=geojson&where=1%3D1&outSR=4326&returnGeometry=true&outFields=city_name`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`City boundary HTTP ${response.status}`);
  }
  
  const gj = await response.json() as GeoJSONFeatureCollection;
  
  if (!gj || gj.type !== 'FeatureCollection' || !gj.features?.length) {
    throw new Error('City boundary returned no features');
  }
  
  cachedCityPolys = geojsonToPolys(gj);
  return cachedCityPolys;
}

async function determineSubmarket(lat: number, lng: number): Promise<string | null> {
  const pt: [number, number] = [lng, lat];
  
  try {
    const cityPolys = await fetchCityBoundary();
    const insideCity = pointInAnyPolygon(pt, cityPolys);
    
    if (!insideCity) {
      return null;
    }
    
    const communities = await fetchCommunityBoundaries();
    const feature = findContainingFeature(pt, communities);
    
    if (feature) {
      const name = String(feature.properties?.[COMMUNITY_NAME_FIELD] || '').trim();
      return name || 'No community match';
    }
    
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

    const googleApiKey = Deno.env.get('GOOGLE_GEOCODING_API_KEY');
    if (!googleApiKey) {
      return new Response(JSON.stringify({ error: 'Geocoding not configured' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get listings that need re-geocoding (mapbox or null source, excluding manual)
    const { data: listings, error: fetchError } = await adminClient
      .from('market_listings')
      .select('id, listing_id, address, city, submarket, geocode_source')
      .or('geocode_source.eq.mapbox,geocode_source.is.null')
      .neq('geocode_source', 'manual');

    if (fetchError) {
      console.error('[Batch Geocode] Fetch error:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch listings' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log(`[Batch Geocode] Found ${listings?.length || 0} listings to re-geocode`);

    let geocoded = 0;
    let failed = 0;
    let skipped = 0;

    for (const listing of listings || []) {
      try {
        const geocodeResult = await geocodeWithGoogle(listing.address, listing.city, googleApiKey);
        
        if (!geocodeResult) {
          console.log(`[Batch Geocode] Failed to geocode: ${listing.address}`);
          failed++;
          continue;
        }

        const shouldAssignSubmarket = listing.city === 'Calgary';
        const submarket = shouldAssignSubmarket
          ? await determineSubmarket(geocodeResult.lat, geocodeResult.lng)
          : null;

        const updatePayload: Record<string, unknown> = {
          latitude: geocodeResult.lat,
          longitude: geocodeResult.lng,
          geocoded_at: new Date().toISOString(),
          geocode_source: 'google',
        };

        if (shouldAssignSubmarket && submarket) {
          updatePayload.submarket = submarket;
        }

        const { error: updateError } = await adminClient
          .from('market_listings')
          .update(updatePayload)
          .eq('id', listing.id);

        if (updateError) {
          console.error(`[Batch Geocode] Update error for ${listing.listing_id}:`, updateError);
          failed++;
        } else {
          geocoded++;
          console.log(`[Batch Geocode] ✓ ${listing.listing_id}: ${listing.address} -> (${geocodeResult.lat}, ${geocodeResult.lng})`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (err) {
        console.error(`[Batch Geocode] Error processing ${listing.listing_id}:`, err);
        failed++;
      }
    }

    console.log(`[Batch Geocode] Complete: ${geocoded} geocoded, ${failed} failed, ${skipped} skipped`);

    return new Response(JSON.stringify({
      success: true,
      total: listings?.length || 0,
      geocoded,
      failed,
      skipped,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[Batch Geocode] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
