import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = {
      propertiesCreated: 0,
      propertiesSkipped: 0,
      cityDataFetched: 0,
      cityDataFailed: 0,
      millRateUpdated: false,
    };

    // 1. Sync any new market listings to properties
    console.log('Starting market listings -> properties sync...');
    
    const { data: marketListings } = await supabase
      .from('market_listings')
      .select('address, city, submarket, size_sf, clear_height_ft, dock_doors, drive_in_doors, listing_type, user_id');

    const { data: existingProperties } = await supabase
      .from('properties')
      .select('address');

    const normalizeAddress = (addr: string) => addr?.toLowerCase().trim() || '';
    const existingAddresses = new Set(
      (existingProperties || []).map(p => normalizeAddress(p.address))
    );

    interface ListingData {
      address: string;
      city: string;
      submarket: string;
      size_sf: number;
      clear_height_ft: number;
      dock_doors: number;
      drive_in_doors: number;
      listing_type: string;
      user_id: string;
    }

    const uniqueListings = new Map<string, ListingData>();
    for (const listing of marketListings || []) {
      const normalized = normalizeAddress(listing.address);
      if (!normalized || existingAddresses.has(normalized)) continue;
      if (!uniqueListings.has(normalized)) {
        uniqueListings.set(normalized, listing);
      }
    }

    for (const listing of uniqueListings.values()) {
      const { error } = await supabase
        .from('properties')
        .insert({
          name: listing.address,
          address: listing.address,
          city: listing.city || '',
          submarket: listing.submarket || '',
          size_sf: listing.size_sf || null,
          clear_height_ft: listing.clear_height_ft || null,
          dock_doors: listing.dock_doors || null,
          drive_in_doors: listing.drive_in_doors || null,
          property_type: listing.listing_type || null,
          created_by: listing.user_id
        });

      if (error) {
        console.error('Error creating property:', error);
        results.propertiesSkipped++;
      } else {
        results.propertiesCreated++;
      }
    }

    console.log(`Properties sync complete: ${results.propertiesCreated} created, ${results.propertiesSkipped} skipped`);

    // 2. Fetch city data for all Calgary properties
    console.log('Starting city data fetch for all properties...');
    
    const { data: calgaryProperties } = await supabase
      .from('properties')
      .select('id, address, city')
      .ilike('city', '%calgary%');

    for (const property of calgaryProperties || []) {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/fetch-city-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            propertyId: property.id,
            address: property.address,
            city: property.city
          })
        });

        if (response.ok) {
          results.cityDataFetched++;
        } else {
          console.error(`Failed to fetch city data for ${property.address}`);
          results.cityDataFailed++;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`Error fetching city data for ${property.id}:`, err);
        results.cityDataFailed++;
      }
    }

    console.log(`City data sync complete: ${results.cityDataFetched} fetched, ${results.cityDataFailed} failed`);

    // 3. Update mill rate from Calgary data (for future automation)
    // Note: Calgary publishes mill rates annually, so we'll keep the manual setting for now
    // This could be automated once a reliable API source is identified
    
    console.log('Nightly property sync complete:', results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Nightly sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
