import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  if (!response.ok) throw new Error(`City boundary HTTP ${response.status}`);
  const gj = await response.json() as GeoJSONFeatureCollection;
  if (!gj || gj.type !== 'FeatureCollection' || !gj.features?.length) {
    throw new Error('City boundary returned no features');
  }
  cachedCityPolys = geojsonToPolys(gj);
  return cachedCityPolys;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { lat, lng } = await req.json();
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return new Response(JSON.stringify({ error: 'lat and lng are required numbers' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const pt: [number, number] = [lng, lat];

    // Check if inside Calgary city boundary
    const cityPolys = await fetchCityBoundary();
    const insideCity = pointInAnyPolygon(pt, cityPolys);

    if (!insideCity) {
      return new Response(JSON.stringify({
        submarket: null,
        insideCity: false,
        message: 'Coordinates are outside Calgary city limits'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find community
    const communities = await fetchCommunityBoundaries();
    const feature = findContainingFeature(pt, communities);
    const submarket = feature
      ? String(feature.properties?.[COMMUNITY_NAME_FIELD] || '').trim() || 'No community match'
      : 'No community match';

    return new Response(JSON.stringify({
      submarket,
      insideCity: true,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('[Lookup Submarket] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
