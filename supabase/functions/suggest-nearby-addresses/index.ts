import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type SuggestRequest = {
  address?: unknown;
  city?: unknown;
  maxSuggestions?: unknown;
};

const QUADRANTS = ['NE', 'NW', 'SE', 'SW'];

function normalizeAddress(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function parseQuadrant(address: string): string | null {
  const parts = address
    .replace(/,.*$/, '')
    .trim()
    .toUpperCase()
    .split(/\s+/);
  return parts.find((p) => QUADRANTS.includes(p)) || null;
}

function isCalgary(city: string): boolean {
  return city.toLowerCase().includes('calgary');
}

async function fetchJson(url: string): Promise<any> {
  const resp = await fetch(url);
  const text = await resp.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: ${text.slice(0, 300)}`);
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: SuggestRequest = {};
    try {
      body = (await req.json()) as SuggestRequest;
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const address = typeof body.address === 'string' ? body.address.trim() : '';
    const city = typeof body.city === 'string' ? body.city.trim() : '';
    const maxSuggestionsRaw = typeof body.maxSuggestions === 'number' ? body.maxSuggestions : 4;
    const maxSuggestions = Math.max(1, Math.min(6, Math.floor(maxSuggestionsRaw)));

    if (!address) {
      return new Response(JSON.stringify({ error: 'Address is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!city) {
      return new Response(JSON.stringify({ error: 'City is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!isCalgary(city)) {
      return new Response(JSON.stringify({ suggestions: [], reason: 'city_not_supported' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GOOGLE_GEOCODING_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Geocoding not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const quadrant = parseQuadrant(address);

    // 1) Geocode input address -> lat/lng
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      `${address}, ${city}, AB, Canada`,
    )}&key=${encodeURIComponent(apiKey)}&region=ca`;
    const geocode = await fetchJson(geocodeUrl);
    if (geocode.status !== 'OK' || !geocode.results?.length) {
      return new Response(JSON.stringify({ suggestions: [], reason: 'geocode_not_found', geocodeStatus: geocode.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const location = geocode.results[0].geometry?.location;
    if (!location?.lat || !location?.lng) {
      return new Response(JSON.stringify({ suggestions: [], reason: 'geocode_missing_location' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const offsets = [
      { lat: 0.0002, lng: 0 },
      { lat: -0.0002, lng: 0 },
      { lat: 0, lng: 0.0003 },
      { lat: 0, lng: -0.0003 },
      { lat: 0.0004, lng: 0 },
      { lat: -0.0004, lng: 0 },
    ];

    const seen = new Set<string>([normalizeAddress(address)]);
    const suggestions: { address: string; formattedAddress: string }[] = [];

    for (const off of offsets) {
      if (suggestions.length >= maxSuggestions) break;

      const lat = location.lat + off.lat;
      const lng = location.lng + off.lng;
      const reverseUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${encodeURIComponent(
        apiKey,
      )}&result_type=street_address&region=ca`;
      const reverse = await fetchJson(reverseUrl);

      if (reverse.status !== 'OK' || !reverse.results?.length) continue;

      for (const result of reverse.results) {
        if (suggestions.length >= maxSuggestions) break;
        const formatted = typeof result.formatted_address === 'string' ? result.formatted_address : '';
        const street = formatted.split(',')[0]?.trim();
        if (!street) continue;

        // Keep quadrant consistent if input had one.
        if (quadrant) {
          const q2 = parseQuadrant(street);
          if (q2 && q2 !== quadrant) continue;
        }

        const key = normalizeAddress(street);
        if (seen.has(key)) continue;
        seen.add(key);
        suggestions.push({ address: street, formattedAddress: formatted });
      }
    }

    return new Response(JSON.stringify({ suggestions, reason: suggestions.length ? 'ok' : 'no_suggestions' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in suggest-nearby-addresses:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
