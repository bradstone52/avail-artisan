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

    // Get properties that need geocoding (no coordinates and not manually pinned)
    // Note: Need to handle NULL geocode_source (which should be included)
    const { data: properties, error: fetchError } = await adminClient
      .from('properties')
      .select('id, name, address, city, geocode_source')
      .or('latitude.is.null,longitude.is.null')
      .or('geocode_source.is.null,geocode_source.neq.manual');

    if (fetchError) {
      console.error('[Batch Geocode Properties] Fetch error:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch properties' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log(`[Batch Geocode Properties] Found ${properties?.length || 0} properties to geocode`);

    let geocoded = 0;
    let failed = 0;

    for (const property of properties || []) {
      try {
        // Skip if no address
        if (!property.address || !property.city) {
          console.log(`[Batch Geocode Properties] Skipping ${property.name}: missing address/city`);
          failed++;
          continue;
        }

        const geocodeResult = await geocodeWithGoogle(property.address, property.city, googleApiKey);
        
        if (!geocodeResult) {
          console.log(`[Batch Geocode Properties] Failed to geocode: ${property.address}`);
          failed++;
          continue;
        }

        const { error: updateError } = await adminClient
          .from('properties')
          .update({
            latitude: geocodeResult.lat,
            longitude: geocodeResult.lng,
            geocoded_at: new Date().toISOString(),
            geocode_source: 'google',
          })
          .eq('id', property.id);

        if (updateError) {
          console.error(`[Batch Geocode Properties] Update error for ${property.name}:`, updateError);
          failed++;
        } else {
          geocoded++;
          console.log(`[Batch Geocode Properties] ✓ ${property.name}: ${property.address} -> (${geocodeResult.lat}, ${geocodeResult.lng})`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (err) {
        console.error(`[Batch Geocode Properties] Error processing ${property.name}:`, err);
        failed++;
      }
    }

    console.log(`[Batch Geocode Properties] Complete: ${geocoded} geocoded, ${failed} failed`);

    return new Response(JSON.stringify({
      success: true,
      total: properties?.length || 0,
      geocoded,
      failed,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[Batch Geocode Properties] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
