import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Field mappings for parsing the sheet
const FIELD_MAPPINGS = [
  { header: 'ListingID', dbColumn: 'listing_id', type: 'string', required: true },
  { header: 'Address', dbColumn: 'address', type: 'string', required: true },
  { header: 'Municipality', dbColumn: 'city', type: 'string', required: true },
  { header: 'Status', dbColumn: 'status', type: 'string', required: true },
  { header: 'Submarket', dbColumn: 'submarket', type: 'string', required: true },
  { header: 'Listing Type', dbColumn: 'listing_type', type: 'string' },
  { header: 'Broker', dbColumn: 'broker_source', type: 'string' },
  { header: 'Total SF', dbColumn: 'size_sf', type: 'number' },
  { header: 'Warehouse SF', dbColumn: 'warehouse_sf', type: 'number' },
  { header: 'Office SF', dbColumn: 'office_sf', type: 'number' },
  { header: 'Ceiling Ht.', dbColumn: 'clear_height_ft', type: 'number' },
  { header: 'Dock Doors', dbColumn: 'dock_doors', type: 'number' },
  { header: 'Drive-in Doors', dbColumn: 'drive_in_doors', type: 'number' },
  { header: 'Power (Amps)', dbColumn: 'power_amps', type: 'string' },
  { header: 'Voltage', dbColumn: 'voltage', type: 'string' },
  { header: 'Yard Area', dbColumn: 'yard_area', type: 'string' },
  { header: 'Sprinklered', dbColumn: 'sprinkler', type: 'string' },
  { header: 'Available', dbColumn: 'availability_date', type: 'string' },
  { header: 'Net Rate', dbColumn: 'asking_rate_psf', type: 'string' },
  { header: 'Op Costs', dbColumn: 'op_costs', type: 'string' },
  { header: 'Gross Rate', dbColumn: 'gross_rate', type: 'string' },
  { header: 'Sale Price', dbColumn: 'sale_price', type: 'string' },
  { header: 'Landlord/Owner/Developer', dbColumn: 'landlord', type: 'string' },
  { header: 'Brochure URL', dbColumn: 'link', type: 'string' },
  { header: 'Notes', dbColumn: 'notes_public', type: 'string' },
];

// Directional indicators that should always remain uppercase
const DIRECTIONAL_INDICATORS = ['NW', 'NE', 'SW', 'SE', 'N', 'S', 'E', 'W'];

/**
 * Convert a string to title case, preserving directional indicators as uppercase.
 * "5555 69 AVENUE SE" → "5555 69 Avenue SE"
 */
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

/**
 * Normalize address strings for better geocoding and consistent display.
 * - Converts ALL CAPS to title case while preserving directional indicators
 * - Removes dashes between street numbers
 * - Removes ordinal suffixes
 */
function normalizeAddress(address: string): string {
  let normalized = address;
  normalized = toTitleCase(normalized);
  normalized = normalized.replace(/(\d+)\s*-\s+(\d)/g, '$1 $2');
  normalized = normalized.replace(/\b(\d+)(st|nd|rd|th)\b/gi, '$1');
  normalized = normalized.replace(/\s+/g, ' ').trim();
  return normalized;
}

const GEOCODE_BATCH_LIMIT = 50; // Max listings to geocode per sync

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

function findHeaderIndex(headers: string[], targetHeader: string): number {
  const normalized = normalizeHeader(targetHeader);
  return headers.findIndex(h => normalizeHeader(h) === normalized);
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : Math.round(num);
}

/**
 * Extract URL from a HYPERLINK formula.
 * Examples:
 *   =HYPERLINK("https://example.com","Brochure") → https://example.com
 *   =HYPERLINK("https://example.com") → https://example.com
 *   https://example.com → https://example.com (already a URL)
 */
function extractHyperlinkUrl(value: string): string {
  if (!value) return '';
  
  // Check if it's a HYPERLINK formula
  const hyperlinkMatch = value.match(/^=HYPERLINK\s*\(\s*"([^"]+)"/i);
  if (hyperlinkMatch) {
    return hyperlinkMatch[1];
  }
  
  // If it already looks like a URL, return as-is
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  
  // Otherwise return empty (not a valid URL)
  return '';
}

function shouldIncludeRow(row: string[], headers: string[]): { include: boolean; reason?: string } {
  const statusIdx = findHeaderIndex(headers, 'Status');
  const distributionIdx = findHeaderIndex(headers, 'Distribution Warehouse?');
  
  const statusValue = statusIdx !== -1 ? row[statusIdx]?.trim().toLowerCase() : '';
  if (statusValue !== 'active') {
    return { include: false, reason: 'inactive' };
  }
  
  const distributionValue = distributionIdx !== -1 ? row[distributionIdx]?.trim().toLowerCase() : '';
  const isTruthy = ['true', 'yes', 'y', '1', 'checked', 'x'].includes(distributionValue);
  if (!isTruthy) {
    return { include: false, reason: 'not_distribution' };
  }
  
  return { include: true };
}

function mapRowToListing(row: string[], headers: string[], userId: string, orgId: string): Record<string, unknown> {
  const listing: Record<string, unknown> = { user_id: userId, org_id: orgId };

  for (const mapping of FIELD_MAPPINGS) {
    const headerIdx = findHeaderIndex(headers, mapping.header);
    if (headerIdx === -1) continue;

    const rawValue = row[headerIdx]?.trim() || '';
    if (!rawValue) continue;

    if (mapping.type === 'number') {
      const numValue = parseNumber(rawValue);
      if (numValue !== undefined) {
        listing[mapping.dbColumn] = numValue;
      }
    } else if (mapping.dbColumn === 'link') {
      // Special handling for hyperlinks - extract URL from HYPERLINK formula
      const url = extractHyperlinkUrl(rawValue);
      if (url) {
        listing[mapping.dbColumn] = url;
      }
    } else {
      listing[mapping.dbColumn] = rawValue;
    }
  }

  // Normalize the address for better geocoding and consistent display
  if (listing.address) {
    listing.address = normalizeAddress(listing.address as string);
  }

  // Defaults
  if (!listing.address) listing.address = '';
  if (!listing.city) listing.city = '';
  if (!listing.submarket) listing.submarket = '';
  if (!listing.size_sf) listing.size_sf = 0;

  // Normalize status
  const validStatuses = ['Active', 'Leased', 'Removed', 'OnHold'];
  const rawStatus = (listing.status as string || '').trim();
  listing.status = validStatuses.find(s => s.toLowerCase() === rawStatus.toLowerCase()) || 'Active';

  // Yes/No/Unknown fields
  const yesNoFields = ['yard', 'cross_dock', 'trailer_parking'];
  for (const field of yesNoFields) {
    listing[field] = 'Unknown';
  }

  return listing;
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token?: string; error?: string }> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  return response.json();
}

// Geocode an address using Mapbox API
async function geocodeAddress(address: string, city: string): Promise<{ lat: number; lng: number } | null> {
  const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');
  if (!mapboxToken) {
    console.log('[Geocode] No MAPBOX_ACCESS_TOKEN available');
    return null;
  }

  const query = `${address}, ${city}, Alberta, Canada`;
  const encodedQuery = encodeURIComponent(query);
  
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${mapboxToken}&limit=1&types=address,poi`
    );
    
    if (!response.ok) {
      console.error(`[Geocode] Mapbox API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      console.log(`[Geocode] Success: "${query}" -> [${lat}, ${lng}]`);
      return { lat, lng };
    }
    
    console.log(`[Geocode] No results for: "${query}"`);
    return null;
  } catch (error) {
    console.error('[Geocode] Error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const orgId = body.orgId;

    if (!orgId) {
      return new Response(JSON.stringify({ error: 'orgId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for data operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify user is member of this org
    const { data: membership } = await adminClient
      .from('org_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return new Response(JSON.stringify({ error: 'Not a member of this organization' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get org integration
    const { data: integration, error: integrationError } = await adminClient
      .from('org_integrations')
      .select('*')
      .eq('org_id', orgId)
      .single();

    if (integrationError || !integration) {
      return new Response(JSON.stringify({ error: 'Admin must connect Google Sheets first' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!integration.sheet_id) {
      return new Response(JSON.stringify({ error: 'No sheet configured. Admin must set up sheet URL.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Org Sync] Starting sync for org: ${orgId}`);

    // Create sync log
    const { data: syncLog } = await adminClient
      .from('sync_logs')
      .insert({
        run_type: 'manual',
        triggered_by: user.id,
        status: 'running',
      })
      .select()
      .single();

    const logId = syncLog?.id;

    // Check if token needs refresh
    let accessToken = integration.google_access_token;
    const expiresAt = integration.google_token_expiry ? new Date(integration.google_token_expiry) : new Date(0);

    if (expiresAt <= new Date()) {
      console.log('[Org Sync] Token expired, refreshing...');
      
      if (!integration.google_refresh_token) {
        await adminClient.from('sync_logs').update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: 'Google connection expired. Admin must reconnect.',
        }).eq('id', logId);

        return new Response(JSON.stringify({ error: 'Google connection expired. Admin must reconnect.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const refreshResult = await refreshAccessToken(integration.google_refresh_token);
      
      if (refreshResult.error || !refreshResult.access_token) {
        await adminClient.from('sync_logs').update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: 'Failed to refresh Google token. Admin must reconnect.',
        }).eq('id', logId);

        return new Response(JSON.stringify({ error: 'Failed to refresh Google token. Admin must reconnect.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      accessToken = refreshResult.access_token;

      // Update token in database
      await adminClient
        .from('org_integrations')
        .update({
          google_access_token: accessToken,
          google_token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
        })
        .eq('org_id', orgId);
    }

    // Fetch data from Google Sheets
    const sheetName = integration.tab_name || 'Vacancy_List';
    const headerRow = integration.header_row || 2;
    const range = `${sheetName}!A:ZZ`;
    
    // Use FORMULA render option to get hyperlink formulas instead of display values
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${integration.sheet_id}/values/${encodeURIComponent(range)}?valueRenderOption=FORMULA`;
    
    const sheetsResponse = await fetch(sheetsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!sheetsResponse.ok) {
      const errorText = await sheetsResponse.text();
      console.error('[Org Sync] Sheets API error:', errorText);
      
      await adminClient.from('sync_logs').update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: `Google Sheets API error: ${errorText}`,
      }).eq('id', logId);

      return new Response(JSON.stringify({ error: 'Failed to fetch sheet data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sheetsData = await sheetsResponse.json();
    const rows = sheetsData.values || [];

    if (rows.length < headerRow) {
      return new Response(JSON.stringify({ error: 'Sheet appears to be empty' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Headers are on headerRow (1-indexed, so index is headerRow - 1)
    const headers = rows[headerRow - 1] || [];
    const dataRows = rows.slice(headerRow);
    
    console.log(`[Org Sync] Found ${dataRows.length} data rows`);

    // Get existing listings for this org to preserve geocoding
    const { data: existingListings } = await adminClient
      .from('listings')
      .select('listing_id, latitude, longitude, address, city, geocoded_at')
      .eq('org_id', orgId);

    const existingMap = new Map<string, { lat: number | null; lng: number | null; address: string; city: string; geocodedAt: string | null }>();
    if (existingListings) {
      for (const l of existingListings) {
        existingMap.set(l.listing_id, {
          lat: l.latitude,
          lng: l.longitude,
          address: l.address,
          city: l.city,
          geocodedAt: l.geocoded_at,
        });
      }
    }

    // Stage listings
    const stagedListings: Record<string, unknown>[] = [];
    const seenListingIds = new Set<string>();
    const skippedBreakdown = {
      inactive: 0,
      not_distribution: 0,
      missing_fields: 0,
      duplicate_listing_id: 0,
    };

    for (const row of dataRows) {
      const filterResult = shouldIncludeRow(row, headers);
      if (!filterResult.include) {
        if (filterResult.reason === 'inactive') skippedBreakdown.inactive++;
        else if (filterResult.reason === 'not_distribution') skippedBreakdown.not_distribution++;
        continue;
      }

      const listing = mapRowToListing(row, headers, user.id, orgId);
      const listingId = (listing.listing_id as string)?.trim();

      if (!listingId) {
        skippedBreakdown.missing_fields++;
        continue;
      }

      if (seenListingIds.has(listingId)) {
        skippedBreakdown.duplicate_listing_id++;
        continue;
      }

      seenListingIds.add(listingId);

      // Preserve existing geocoding if address hasn't changed
      const existing = existingMap.get(listingId);
      if (existing && existing.lat && existing.lng) {
        const addressChanged = existing.address !== listing.address || existing.city !== listing.city;
        if (!addressChanged) {
          listing.latitude = existing.lat;
          listing.longitude = existing.lng;
          listing.geocoded_at = existing.geocodedAt;
          listing.geocode_source = 'mapbox';
        }
      }

      stagedListings.push(listing);
    }

    const rowsSkipped = Object.values(skippedBreakdown).reduce((a, b) => a + b, 0);

    console.log(`[Org Sync] Staged ${stagedListings.length} listings, skipped ${rowsSkipped}`);

    if (stagedListings.length === 0) {
      await adminClient.from('sync_logs').update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: 'No valid listings found after applying filters',
        rows_read: dataRows.length,
        rows_skipped: rowsSkipped,
        skipped_breakdown: skippedBreakdown,
      }).eq('id', logId);

      return new Response(JSON.stringify({ error: 'No valid listings found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Geocode listings that don't have coordinates (rate limited)
    let geocodedCount = 0;
    const toGeocode = stagedListings.filter(l => !l.latitude || !l.longitude);
    console.log(`[Org Sync] ${toGeocode.length} listings need geocoding (limit: ${GEOCODE_BATCH_LIMIT})`);

    for (const listing of toGeocode) {
      if (geocodedCount >= GEOCODE_BATCH_LIMIT) {
        console.log(`[Org Sync] Reached geocode limit (${GEOCODE_BATCH_LIMIT}), remaining will be geocoded next sync`);
        break;
      }

      const address = listing.address as string;
      const city = listing.city as string;
      
      if (address && city) {
        const coords = await geocodeAddress(address, city);
        if (coords) {
          listing.latitude = coords.lat;
          listing.longitude = coords.lng;
          listing.geocoded_at = new Date().toISOString();
          listing.geocode_source = 'mapbox';
          geocodedCount++;
        }
      }

      // Small delay to avoid rate limiting
      if (geocodedCount < GEOCODE_BATCH_LIMIT && geocodedCount < toGeocode.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`[Org Sync] Geocoded ${geocodedCount} listings`);

    // Delete existing org listings and insert new ones
    console.log(`[Org Sync] Deleting existing listings for org: ${orgId}`);
    await adminClient.from('listings').delete().eq('org_id', orgId);

    console.log(`[Org Sync] Inserting ${stagedListings.length} new listings`);
    const { error: insertError } = await adminClient
      .from('listings')
      .upsert(stagedListings, { onConflict: 'org_id,listing_id' });

    if (insertError) {
      console.error('[Org Sync] Insert error:', insertError);
      
      await adminClient.from('sync_logs').update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: `Failed to insert listings: ${insertError.message}`,
      }).eq('id', logId);

      return new Response(JSON.stringify({ error: 'Failed to insert listings' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update org_integrations timestamp
    await adminClient
      .from('org_integrations')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('org_id', orgId);

    // Update sync log
    await adminClient.from('sync_logs').update({
      status: 'success',
      completed_at: new Date().toISOString(),
      rows_read: dataRows.length,
      rows_imported: stagedListings.length,
      rows_skipped: rowsSkipped,
      skipped_breakdown: skippedBreakdown,
    }).eq('id', logId);

    const listingsWithCoords = stagedListings.filter(l => l.latitude && l.longitude).length;
    console.log(`[Org Sync] Complete: ${stagedListings.length} imported, ${rowsSkipped} skipped, ${listingsWithCoords} geocoded`);

    return new Response(
      JSON.stringify({
        success: true,
        rows_imported: stagedListings.length,
        rows_skipped: rowsSkipped,
        skipped_breakdown: skippedBreakdown,
        geocoded_this_run: geocodedCount,
        total_with_coordinates: listingsWithCoords,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Org Sync] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
