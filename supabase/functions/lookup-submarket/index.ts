import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── ArcGIS polygon helpers ──────────────────────────────────────────────────

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
  geometry: { type: string; coordinates: number[][][] | number[][][][]; };
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
    if (g.type === 'Polygon') polys.push(g.coordinates as number[][][]);
    else if (g.type === 'MultiPolygon') {
      for (const p of g.coordinates as number[][][][]) polys.push(p);
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

// ── City of Calgary Assessment API fallback ─────────────────────────────────

const ASSESSMENT_API = 'https://data.calgary.ca/resource/4bsw-nn7w.json';

/**
 * Returns true if the ArcGIS result looks like a sector code (e.g. "10b", "03")
 * rather than a real community name (e.g. "Starfield", "Foothills Industrial").
 */
function looksLikeCodeName(name: string): boolean {
  if (!name) return true;
  // Matches things like "10b", "03", "2a", etc.
  return /^[0-9]+[a-z]?$/i.test(name.trim());
}

/**
 * Use the City of Calgary assessment API to look up the community name
 * for a given address. This is the same approach used by fetch-city-data.
 */
async function lookupCommunityFromCityApi(address: string): Promise<string | null> {
  try {
    const parts = address
      .replace(/,.*$/, '')
      .replace(/\s+(Calgary|AB|Alberta).*$/i, '')
      .trim()
      .toUpperCase()
      .split(/\s+/);

    const streetNumber = parts[0];
    if (!streetNumber || !/^\d+$/.test(streetNumber)) return null;

    const QUADRANTS = ['NE', 'NW', 'SE', 'SW'];
    const STREET_TYPES = ['ST', 'STREET', 'AVE', 'AV', 'AVENUE', 'DR', 'DRIVE', 'RD', 'ROAD',
      'BLVD', 'BOULEVARD', 'LN', 'LANE', 'PL', 'PLACE', 'CT', 'COURT', 'WAY', 'CRES',
      'CRESCENT', 'TR', 'TRAIL'];

    const quadrant = parts.find(p => QUADRANTS.includes(p)) || null;
    const streetTypeRaw = parts.find(p => STREET_TYPES.includes(p)) || null;
    const streetTypeAbbrev = streetTypeRaw
      ? (streetTypeRaw === 'AVENUE' || streetTypeRaw === 'AVE' ? 'AV' : streetTypeRaw === 'LANE' ? 'LN' : streetTypeRaw)
      : null;
    const streetNameNumber = parts.slice(1).find(p => /^\d+$/.test(p)) || null;
    const streetNameWord = !streetNameNumber
      ? parts.slice(1).find(p => !QUADRANTS.includes(p) && !STREET_TYPES.includes(p) && !/^\d+$/.test(p) && p.length > 0) || null
      : null;

    // Build search patterns
    const searchPatterns: string[] = [];
    if (streetNumber && streetNameNumber && streetTypeAbbrev && quadrant) {
      searchPatterns.push(`${streetNumber} ${streetNameNumber} ${streetTypeAbbrev} ${quadrant}`);
    }
    if (streetNumber && streetNameNumber && quadrant) {
      searchPatterns.push(`${streetNumber} ${streetNameNumber} ${quadrant}`);
    }
    if (streetNumber && streetNameWord && streetTypeAbbrev && quadrant) {
      searchPatterns.push(`${streetNumber} ${streetNameWord} ${streetTypeAbbrev} ${quadrant}`);
    }
    if (streetNumber && streetNameWord && quadrant) {
      searchPatterns.push(`${streetNumber} ${streetNameWord} ${quadrant}`);
    }

    if (searchPatterns.length === 0) return null;

    for (const pattern of searchPatterns.slice(0, 2)) {
      const escapedValue = pattern.replace(/'/g, "''");
      const whereClause = `address like '%${escapedValue}%'`;
      const params = new URLSearchParams();
      params.set('$where', whereClause);
      params.set('$limit', '5');
      const url = `${ASSESSMENT_API}?${params.toString()}`;

      console.log(`[City API Fallback] Trying: ${url}`);
      const resp = await fetch(url);
      if (!resp.ok) { await resp.text(); continue; }

      const data = await resp.json();
      if (!data || data.length === 0) continue;

      // Filter to matching street number + quadrant
      const candidates = data.filter((d: Record<string, unknown>) => {
        const addr = String(d.address || '').toUpperCase();
        const matchesStreetNum = addr.startsWith(`${streetNumber} `);
        const matchesQuadrant = quadrant ? addr.includes(` ${quadrant}`) : true;
        return matchesStreetNum && matchesQuadrant;
      });

      if (candidates.length === 0) continue;

      // Extract community_name
      const record = candidates[0];
      const communityName = String(
        record.community_name || record.comm_name || record.community || ''
      ).trim();

      if (communityName) {
        console.log(`[City API Fallback] Found community: "${communityName}" for "${pattern}"`);
        return communityName;
      }
    }

    return null;
  } catch (error) {
    console.error('[City API Fallback] Error:', error);
    return null;
  }
}

// ── Main handler ────────────────────────────────────────────────────────────

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

    const { lat, lng, address } = await req.json();
    
    // Support address-only mode (no coordinates needed)
    const hasCoords = typeof lat === 'number' && typeof lng === 'number';
    const hasAddress = address && typeof address === 'string';

    if (!hasCoords && !hasAddress) {
      return new Response(JSON.stringify({ error: 'Provide lat/lng or address' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Address-only mode: skip coordinate checks, go straight to City API
    if (!hasCoords && hasAddress) {
      console.log(`[Lookup] Address-only mode for: "${address}"`);
      const cityResult = await lookupCommunityFromCityApi(address);
      return new Response(JSON.stringify({
        submarket: cityResult || null,
        insideCity: !!cityResult,
        source: cityResult ? 'city_api' : null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const pt: [number, number] = [lng, lat];

    // 1. Check if inside Calgary city boundary
    const cityPolys = await fetchCityBoundary();
    const insideCity = pointInAnyPolygon(pt, cityPolys);

    if (!insideCity) {
      return new Response(JSON.stringify({
        submarket: null,
        insideCity: false,
        source: null,
        message: 'Coordinates are outside Calgary city limits'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Try ArcGIS community boundary lookup
    let submarket: string | null = null;
    let source: 'arcgis' | 'city_api' = 'arcgis';

    try {
      const communities = await fetchCommunityBoundaries();
      const feature = findContainingFeature(pt, communities);
      if (feature) {
        submarket = String(feature.properties?.[COMMUNITY_NAME_FIELD] || '').trim() || null;
      }
    } catch (err) {
      console.error('[Lookup] ArcGIS error:', err);
    }

    // 3. If ArcGIS returned a code-like name (e.g. "10b") or nothing, fall back to City API
    if (!submarket || looksLikeCodeName(submarket)) {
      console.log(`[Lookup] ArcGIS result "${submarket}" looks like a code — trying City API fallback`);
      
      if (hasAddress) {
        const cityResult = await lookupCommunityFromCityApi(address);
        if (cityResult) {
          submarket = cityResult;
          source = 'city_api';
        }
      } else {
        console.log('[Lookup] No address provided for City API fallback');
      }
    }

    return new Response(JSON.stringify({
      submarket: submarket || null,
      insideCity: true,
      source,
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
