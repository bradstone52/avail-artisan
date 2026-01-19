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
  { header: 'Last Verified', dbColumn: 'last_verified_date', type: 'date' },
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

function parseCSV(csvText: string): string[][] {
  const lines = csvText.split('\n');
  const result: string[][] = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const row: string[] = [];
    let cell = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(cell.trim());
        cell = '';
      } else {
        cell += char;
      }
    }
    row.push(cell.trim());
    result.push(row);
  }
  
  return result;
}

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
 * Parse a date string or Google Sheets serial number, returns ISO date or undefined.
 * Google Sheets stores dates as serial numbers (days since Dec 30, 1899).
 * With valueRenderOption=FORMULA, dates may come as raw numbers like "45988".
 */
function parseDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  
  const trimmed = value.trim();
  
  // Check if it's a Google Sheets serial date number (typically 5 digits, 40000-50000 range for recent years)
  if (/^\d+$/.test(trimmed)) {
    const serialNumber = parseInt(trimmed, 10);
    // Google Sheets epoch is December 30, 1899
    if (serialNumber > 0 && serialNumber < 100000) {
      const epoch = new Date(1899, 11, 30); // Dec 30, 1899
      const date = new Date(epoch.getTime() + serialNumber * 24 * 60 * 60 * 1000);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    return undefined;
  }
  
  // Try to parse common date formats
  const date = new Date(trimmed);
  if (isNaN(date.getTime())) return undefined;
  return date.toISOString().split('T')[0];
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

interface SizeThresholds {
  min: number;
  max: number;
}

function shouldIncludeRow(
  row: string[], 
  headers: string[], 
  sizeThresholds?: SizeThresholds
): { include: boolean; reason?: string } {
  const statusIdx = findHeaderIndex(headers, 'Status');
  const distributionIdx = findHeaderIndex(headers, 'Distribution Warehouse?');
  const sizeIdx = findHeaderIndex(headers, 'Total SF');
  
  const statusValue = statusIdx !== -1 ? row[statusIdx]?.trim().toLowerCase() : '';
  if (statusValue !== 'active') {
    return { include: false, reason: 'inactive' };
  }
  
  const distributionValue = distributionIdx !== -1 ? row[distributionIdx]?.trim().toLowerCase() : '';
  const isTruthy = ['true', 'yes', 'y', '1', 'checked', 'x'].includes(distributionValue);
  if (!isTruthy) {
    return { include: false, reason: 'not_distribution' };
  }
  
  // Size filtering
  if (sizeThresholds && sizeIdx !== -1) {
    const sizeValue = parseNumber(row[sizeIdx]);
    if (sizeValue !== undefined) {
      if (sizeValue < sizeThresholds.min || sizeValue > sizeThresholds.max) {
        return { include: false, reason: 'outside_size_range' };
      }
    }
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
    } else if (mapping.type === 'date') {
      // Special handling for dates - parse Google Sheets serial numbers
      const dateValue = parseDate(rawValue);
      if (dateValue) {
        listing[mapping.dbColumn] = dateValue;
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  // Use service role for scheduled sync (no user session)
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Parse request body for run_type (manual syncs can pass this)
  let runType = 'scheduled';
  let triggeredBy: string | null = null;
  
  try {
    const body = await req.json().catch(() => ({}));
    runType = body.run_type || 'scheduled';
    triggeredBy = body.triggered_by || null;
  } catch {
    // Default to scheduled
  }

  console.log(`[Scheduled Sync] Starting ${runType} sync`);

  // Create sync log entry
  const { data: syncLog, error: logError } = await supabase
    .from('sync_logs')
    .insert({
      run_type: runType,
      triggered_by: triggeredBy,
      status: 'running',
    })
    .select()
    .single();

  if (logError) {
    console.error('[Scheduled Sync] Failed to create sync log:', logError);
  }

  const logId = syncLog?.id;

  const updateLog = async (updates: Record<string, unknown>) => {
    if (!logId) return;
    await supabase.from('sync_logs').update(updates).eq('id', logId);
  };

  try {
    // Get workspace connection
    const { data: connection, error: connError } = await supabase
      .from('sheet_connections')
      .select('*')
      .eq('is_workspace_connection', true)
      .maybeSingle();

    if (connError || !connection) {
      throw new Error('No workspace sheet connection found');
    }

    // Get workspace OAuth token
    const { data: tokenData, error: tokenError } = await supabase
      .from('google_oauth_tokens')
      .select('*')
      .eq('is_workspace_token', true)
      .maybeSingle();

    if (tokenError || !tokenData) {
      // Mark credentials as expired
      await supabase.from('sync_settings').update({ google_credentials_expired: true }).neq('id', '');
      throw new Error('Google connection expired; admin reconnect required');
    }

    // Check if token is expired and refresh if needed
    let accessToken = tokenData.access_token;
    const expiresAt = new Date(tokenData.expires_at);
    
    if (expiresAt <= new Date()) {
      console.log('[Scheduled Sync] Token expired, refreshing...');
      
      if (!tokenData.refresh_token) {
        await supabase.from('sync_settings').update({ google_credentials_expired: true }).neq('id', '');
        throw new Error('Google connection expired; admin reconnect required');
      }

      const refreshResult = await refreshAccessToken(tokenData.refresh_token);
      
      if (refreshResult.error || !refreshResult.access_token) {
        await supabase.from('sync_settings').update({ google_credentials_expired: true }).neq('id', '');
        throw new Error('Google connection expired; admin reconnect required');
      }

      accessToken = refreshResult.access_token;
      
      // Update token in database
      await supabase
        .from('google_oauth_tokens')
        .update({
          access_token: accessToken,
          expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
        })
        .eq('id', tokenData.id);
    }

    // Clear expired flag if we got here
    await supabase.from('sync_settings').update({ google_credentials_expired: false }).neq('id', '');

    // Fetch data from Google Sheets
    const spreadsheetId = connection.google_sheet_id;
    const sheetName = connection.tab_name || 'Sheet1';
    const range = `${sheetName}!A:ZZ`;
    
    // Use FORMULA render option to get hyperlink formulas instead of display values
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMULA`;
    
    const sheetsResponse = await fetch(sheetsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!sheetsResponse.ok) {
      const errorText = await sheetsResponse.text();
      throw new Error(`Google Sheets API error: ${errorText}`);
    }

    const sheetsData = await sheetsResponse.json();
    const rows = sheetsData.values || [];

    if (rows.length < 2) {
      throw new Error('Sheet appears to be empty');
    }

    // Headers are on row 2 (index 1)
    const headers = rows[1] || [];
    const dataRows = rows.slice(2);
    
    console.log(`[Scheduled Sync] Found ${dataRows.length} data rows`);

    // Get the user_id from the connection (admin who set it up)
    const userId = connection.user_id;

    // Get the org_id for the user who set up the connection
    const { data: orgMemberData } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (!orgMemberData?.org_id) {
      throw new Error('Connection owner is not a member of any organization');
    }

    const orgId = orgMemberData.org_id;
    console.log(`[Scheduled Sync] Syncing for org: ${orgId}`);

    // Stage listings
    const stagedListings: Record<string, unknown>[] = [];
    const seenListingIds = new Set<string>();
    const skippedBreakdown = {
      inactive: 0,
      not_distribution: 0,
      outside_size_range: 0,
      missing_fields: 0,
      duplicate_listing_id: 0,
    };

    // Get sync settings for size thresholds
    const { data: syncSettingsData } = await supabase
      .from('sync_settings')
      .select('size_threshold_min, size_threshold_max')
      .limit(1)
      .maybeSingle();

    const sizeThresholds: SizeThresholds = {
      min: syncSettingsData?.size_threshold_min ?? 100000,
      max: syncSettingsData?.size_threshold_max ?? 500000,
    };

    console.log(`[Scheduled Sync] Size thresholds: ${sizeThresholds.min} - ${sizeThresholds.max} SF`);

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      
      const filterResult = shouldIncludeRow(row, headers, sizeThresholds);
      if (!filterResult.include) {
        if (filterResult.reason === 'inactive') {
          skippedBreakdown.inactive++;
        } else if (filterResult.reason === 'not_distribution') {
          skippedBreakdown.not_distribution++;
        } else if (filterResult.reason === 'outside_size_range') {
          skippedBreakdown.outside_size_range++;
        }
        continue;
      }

      const listing = mapRowToListing(row, headers, userId, orgId);
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
      stagedListings.push(listing);
    }

    const rowsSkipped = skippedBreakdown.inactive + skippedBreakdown.not_distribution + 
                        skippedBreakdown.outside_size_range + skippedBreakdown.missing_fields + 
                        skippedBreakdown.duplicate_listing_id;

    console.log(`[Scheduled Sync] Staged ${stagedListings.length} listings, skipped ${rowsSkipped}`);

    if (stagedListings.length === 0) {
      throw new Error('No valid listings found after applying filters');
    }

    // PHASE 2: Atomic swap - delete only this org's listings
    console.log(`[Scheduled Sync] Deleting existing listings for org: ${orgId}`);
    const { error: deleteError } = await supabase
      .from('listings')
      .delete()
      .eq('org_id', orgId);

    if (deleteError) {
      throw new Error(`Failed to clear old listings: ${deleteError.message}`);
    }

    console.log(`[Scheduled Sync] Inserting ${stagedListings.length} new listings`);
    const { error: insertError } = await supabase
      .from('listings')
      .upsert(stagedListings, { onConflict: 'org_id,listing_id' });

    if (insertError) {
      throw new Error(`Failed to insert new listings: ${insertError.message}`);
    }

    // Update connection timestamp
    await supabase
      .from('sheet_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', connection.id);

    // Update sync settings
    await supabase
      .from('sync_settings')
      .update({
        last_scheduled_run_at: new Date().toISOString(),
        last_scheduled_run_status: 'success',
      })
      .neq('id', '');

    // Update sync log
    await updateLog({
      status: 'success',
      completed_at: new Date().toISOString(),
      rows_read: dataRows.length,
      rows_imported: stagedListings.length,
      rows_skipped: rowsSkipped,
      skipped_breakdown: skippedBreakdown,
    });

    console.log(`[Scheduled Sync] Complete: ${stagedListings.length} imported, ${rowsSkipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        rows_imported: stagedListings.length,
        rows_skipped: rowsSkipped,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Scheduled Sync] Error:', errorMessage);

    // Update sync log with error
    await updateLog({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: errorMessage,
    });

    // Update sync settings
    await supabase
      .from('sync_settings')
      .update({
        last_scheduled_run_at: new Date().toISOString(),
        last_scheduled_run_status: `failed: ${errorMessage}`,
      })
      .neq('id', '');

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
