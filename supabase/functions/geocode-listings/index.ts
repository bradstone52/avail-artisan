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

async function geocodeAddress(address: string, city: string | null, mapboxToken: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const fullAddress = city ? `${address}, ${city}, Canada` : `${address}, Canada`;
    const encodedAddress = encodeURIComponent(fullAddress);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${mapboxToken}&limit=1&country=CA`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Geocoding failed for "${fullAddress}": ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lat, lng };
    }
    
    console.log(`No geocoding results for: ${fullAddress}`);
    return null;
  } catch (error) {
    console.error(`Geocoding error for "${address}":`, error);
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

    const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');
    if (!mapboxToken) {
      console.error('MAPBOX_ACCESS_TOKEN not configured');
      return new Response(JSON.stringify({ error: 'Geocoding not configured' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Get listings missing coordinates
    const { data: listingsToGeocode, error: fetchError } = await supabaseAdmin
      .from('listings')
      .select('id, address, city')
      .or('latitude.is.null,longitude.is.null,latitude.eq.0,longitude.eq.0')
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

    console.log(`Geocoding ${listingsToGeocode.length} listings...`);

    const results: GeocodedResult[] = [];
    let successCount = 0;
    let failCount = 0;

    for (const listing of listingsToGeocode as Listing[]) {
      const coords = await geocodeAddress(listing.address, listing.city, mapboxToken);
      
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
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update all geocoded listings
    for (const result of results) {
      const { error: updateError } = await supabaseAdmin
        .from('listings')
        .update({
          latitude: result.latitude,
          longitude: result.longitude,
          geocode_source: 'mapbox',
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
