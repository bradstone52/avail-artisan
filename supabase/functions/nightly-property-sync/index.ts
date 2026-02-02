import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Check if this is a batch processing request (internal call)
  let body: { batchStart?: number; batchSize?: number; syncId?: string; totalProperties?: number } = {};
  try {
    body = await req.json();
  } catch {
    // No body = initial trigger
  }

  const isBatchRequest = typeof body.batchStart === 'number';

  if (isBatchRequest) {
    // This is an internal batch processing call
    return await processBatch(supabase as any, supabaseUrl, supabaseServiceKey, body as any);
  }

  // Initial trigger - start the sync process
  try {
    const syncId = crypto.randomUUID();
    
    // 0. Sync mill rate from Alberta Regional Dashboard
    console.log('Checking for updated mill rate...');
    try {
      const millRateResponse = await fetch(
        'https://regionaldashboard.alberta.ca/export/opendata/Non-residential%20Mill%20Rate/jsons'
      );
      
      if (millRateResponse.ok) {
        const millRateData = await millRateResponse.json();
        
        // Filter for Calgary and find the most recent year
        const calgaryRates = (millRateData || [])
          .filter((item: any) => 
            item.Region?.toLowerCase() === 'calgary' && 
            item.CalculatedValue && 
            item.Period
          )
          .sort((a: any, b: any) => parseInt(b.Period) - parseInt(a.Period));
        
        if (calgaryRates.length > 0) {
          const latestRate = calgaryRates[0];
          const newMillRate = parseFloat(latestRate.CalculatedValue) / 1000; // Convert from per-$1000 to decimal
          const newMillRateYear = String(latestRate.Period);
          
          console.log(`Latest Calgary mill rate: ${newMillRate} (${newMillRateYear})`);
          
          // Update workspace_settings if different
          await supabase
            .from('workspace_settings')
            .upsert({ key: 'mill_rate', value: newMillRate } as any, { onConflict: 'key' });
          
          await supabase
            .from('workspace_settings')
            .upsert({ key: 'mill_rate_year', value: newMillRateYear } as any, { onConflict: 'key' });
          
          console.log(`Mill rate updated to ${(newMillRate * 100).toFixed(4)}% (${newMillRateYear})`);
        }
      }
    } catch (millRateError) {
      console.error('Error fetching mill rate (non-fatal):', millRateError);
      // Continue with sync even if mill rate fetch fails
    }
    
    // 1. Sync any new market listings to properties (fast operation)
    console.log('Starting market listings -> properties sync...');
    
    const { data: marketListings } = await supabase
      .from('market_listings')
      .select('address, city, submarket, size_sf, clear_height_ft, dock_doors, drive_in_doors, listing_type, user_id');

    const { data: existingProperties } = await supabase
      .from('properties')
      .select('address');

    const normalizeAddress = (addr: string) => addr?.toLowerCase().trim() || '';
    const existingAddresses = new Set(
      (existingProperties || []).map((p: any) => normalizeAddress(p.address))
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
    for (const listing of (marketListings || []) as any[]) {
      const normalized = normalizeAddress(listing.address);
      if (!normalized || existingAddresses.has(normalized)) continue;
      if (!uniqueListings.has(normalized)) {
        uniqueListings.set(normalized, listing);
      }
    }

    let propertiesCreated = 0;
    let propertiesSkipped = 0;

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
        propertiesSkipped++;
      } else {
        propertiesCreated++;
      }
    }

    console.log(`Properties sync complete: ${propertiesCreated} created, ${propertiesSkipped} skipped`);

    // 2. Get Calgary properties count and initialize progress
    const { data: calgaryProperties } = await supabase
      .from('properties')
      .select('id')
      .ilike('city', '%calgary%');

    const totalProperties = calgaryProperties?.length || 0;

    // Initialize progress
    await supabase
      .from('workspace_settings')
      .upsert({
        key: 'city_data_sync_progress',
        value: { syncId, current: 0, total: totalProperties, status: 'running', updatedAt: new Date().toISOString() }
      } as any, { onConflict: 'key' });

    // 3. Trigger first batch (fire and forget - don't await)
    const BATCH_SIZE = 20;
    
    // Use EdgeRuntime.waitUntil to keep processing after response
    const batchPromise = fetch(`${supabaseUrl}/functions/v1/nightly-property-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        batchStart: 0,
        batchSize: BATCH_SIZE,
        syncId,
        totalProperties
      })
    });

    // Don't await - let it run in background
    batchPromise.catch(err => console.error('Batch trigger failed:', err));

    console.log(`Sync initiated: ${totalProperties} properties to process in batches of ${BATCH_SIZE}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Sync started',
        results: { propertiesCreated, propertiesSkipped, totalProperties, syncId }
      }),
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

async function processBatch(
  supabase: any,
  supabaseUrl: string,
  supabaseServiceKey: string,
  params: { 
    batchStart: number; 
    batchSize: number; 
    syncId: string; 
    totalProperties: number;
    matched?: number;
    unmatched?: number;
    unmatchedAddresses?: { id: string; address: string }[];
  }
) {
  const { batchStart, batchSize, syncId, totalProperties } = params;
  let matched = params.matched || 0;
  let unmatched = params.unmatched || 0;
  let unmatchedAddresses = params.unmatchedAddresses || [];
  
  console.log(`Processing batch: start=${batchStart}, size=${batchSize}, total=${totalProperties}`);

  try {
    // Fetch Calgary properties for this batch
    const { data: calgaryProperties } = await supabase
      .from('properties')
      .select('id, address, city')
      .ilike('city', '%calgary%')
      .range(batchStart, batchStart + batchSize - 1);

    let fetched = 0;
    let failed = 0;

    for (let i = 0; i < (calgaryProperties || []).length; i++) {
      const property = (calgaryProperties as any[])[i];
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

        // Parse the response to check match status
        const responseText = await response.text();
        let responseData: { assessmentFound?: boolean; matchStatus?: string } = {};
        try {
          responseData = JSON.parse(responseText);
        } catch {
          // Ignore parse errors
        }

        if (response.ok) {
          fetched++;
          // Track matched vs unmatched based on response
          if (responseData.matchStatus === 'found' || responseData.assessmentFound) {
            matched++;
          } else {
            unmatched++;
            unmatchedAddresses.push({ id: property.id, address: property.address });
          }
        } else {
          console.error(`Failed to fetch city data for ${property.address}`);
          failed++;
          unmatched++;
          unmatchedAddresses.push({ id: property.id, address: property.address });
        }
        
        // Update progress
        const currentProgress = batchStart + i + 1;
        await supabase
          .from('workspace_settings')
          .upsert({
            key: 'city_data_sync_progress',
            value: { 
              syncId, 
              current: currentProgress, 
              total: totalProperties, 
              status: 'running', 
              matched,
              unmatched,
              updatedAt: new Date().toISOString() 
            }
          } as any, { onConflict: 'key' });
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (err) {
        console.error(`Error fetching city data for ${property.id}:`, err);
        failed++;
        unmatched++;
        unmatchedAddresses.push({ id: property.id, address: property.address });
      }
    }

    console.log(`Batch complete: ${fetched} fetched, ${failed} failed, ${matched} matched, ${unmatched} unmatched`);

    // Check if there are more properties to process
    const nextBatchStart = batchStart + batchSize;
    
    if (nextBatchStart < totalProperties) {
      // Trigger next batch (fire and forget) - pass along match tracking
      const nextBatchPromise = fetch(`${supabaseUrl}/functions/v1/nightly-property-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          batchStart: nextBatchStart,
          batchSize,
          syncId,
          totalProperties,
          matched,
          unmatched,
          unmatchedAddresses: unmatchedAddresses.slice(-50) // Keep last 50 for display
        })
      });

      nextBatchPromise.catch(err => console.error('Next batch trigger failed:', err));
      
      console.log(`Triggered next batch starting at ${nextBatchStart}`);
    } else {
      // All done - mark as complete with final counts
      await supabase
        .from('workspace_settings')
        .upsert({
          key: 'city_data_sync_progress',
          value: { 
            syncId, 
            current: totalProperties, 
            total: totalProperties, 
            status: 'complete',
            matched,
            unmatched,
            unmatchedAddresses: unmatchedAddresses.slice(-50),
            updatedAt: new Date().toISOString() 
          }
        } as any, { onConflict: 'key' });
      
      console.log(`City data sync complete! Matched: ${matched}, Unmatched: ${unmatched}`);
    }

    return new Response(
      JSON.stringify({ success: true, batchStart, fetched, failed, matched, unmatched }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Batch processing error:', error);
    
    // Mark as failed
    await supabase
      .from('workspace_settings')
      .upsert({
        key: 'city_data_sync_progress',
        value: { 
          syncId, 
          current: batchStart, 
          total: totalProperties, 
          status: 'failed', 
          error: error.message,
          matched,
          unmatched,
          updatedAt: new Date().toISOString() 
        }
      } as any, { onConflict: 'key' });

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
