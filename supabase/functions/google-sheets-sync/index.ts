import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

function findHeaderIndex(headers: string[], targetHeader: string): number {
  const normalized = normalizeHeader(targetHeader);
  return headers.findIndex((h) => normalizeHeader(h) === normalized);
}

function columnIndexToLetter(index: number): string {
  // 0 -> A, 25 -> Z, 26 -> AA ...
  let n = index + 1;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

function extractHyperlinkUrl(value: string): string {
  if (!value) return '';
  const hyperlinkMatch = value.match(/^=HYPERLINK\s*\(\s*"([^"]+)"/i);
  if (hyperlinkMatch) return hyperlinkMatch[1];
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return '';
}

async function fetchHyperlinksForColumn(params: {
  spreadsheetId: string;
  sheetName: string;
  accessToken: string;
  colIndex: number;
  startRow: number; // 1-indexed
  rowCount: number;
}): Promise<(string | undefined)[]> {
  const { spreadsheetId, sheetName, accessToken, colIndex, startRow, rowCount } = params;

  const colLetter = columnIndexToLetter(colIndex);
  const endRow = startRow + rowCount - 1;
  const range = `${sheetName}!${colLetter}${startRow}:${colLetter}${endRow}`;

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=true&ranges=${encodeURIComponent(
    range
  )}&fields=sheets(properties(title),data(rowData(values(hyperlink,formattedValue,userEnteredValue))))`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt);
  }

  const json = await res.json();
  const sheet = (json?.sheets ?? []).find((s: any) => s?.properties?.title === sheetName) ?? json?.sheets?.[0];
  const rowData = sheet?.data?.[0]?.rowData ?? [];

  const result: (string | undefined)[] = Array.from({ length: rowCount }, () => undefined);

  for (let i = 0; i < rowCount; i++) {
    const r = rowData[i];
    const cell = r?.values?.[0];

    const hyperlink = cell?.hyperlink as string | undefined;
    if (hyperlink) {
      result[i] = hyperlink;
      continue;
    }

    const formula = cell?.userEnteredValue?.formulaValue as string | undefined;
    if (formula) {
      const extracted = extractHyperlinkUrl(formula);
      if (extracted) {
        result[i] = extracted;
        continue;
      }
    }

    const formatted = cell?.formattedValue as string | undefined;
    if (formatted && (formatted.startsWith('http://') || formatted.startsWith('https://'))) {
      result[i] = formatted;
      continue;
    }
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('Auth claims error:', claimsError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const userId = claimsData.claims.sub;
    const { spreadsheetId, sheetName, headerRow = 1 } = await req.json();

    console.log('Syncing sheet for user:', userId, 'spreadsheet:', spreadsheetId, 'headerRow:', headerRow);

    // Get OAuth tokens using service role - try workspace token first, then user token
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // First try to get a workspace token
    let tokenData = null;
    const { data: workspaceToken, error: workspaceError } = await supabaseAdmin
      .from('google_oauth_tokens')
      .select('*')
      .eq('is_workspace_token', true)
      .maybeSingle();

    if (workspaceToken) {
      console.log('Using workspace OAuth token');
      tokenData = workspaceToken;
    } else {
      // Fall back to user's personal token
      console.log('No workspace token found, trying user token for:', userId);
      const { data: userToken, error: userError } = await supabaseAdmin
        .from('google_oauth_tokens')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (userError || !userToken) {
        console.error('No OAuth tokens found:', userError);
        return new Response(JSON.stringify({ error: 'Not authorized with Google. Please ask an admin to reconnect.' }), { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
      tokenData = userToken;
    }

    let accessToken = tokenData.access_token;

    // Check if token is expired and refresh if needed
    if (new Date(tokenData.expires_at) < new Date()) {
      console.log('Token expired, refreshing...');
      
      if (!tokenData.refresh_token) {
        console.error('No refresh token available');
        return new Response(JSON.stringify({ error: 'Token expired and no refresh token. Please reconnect.' }), { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      const refreshed = await refreshAccessToken(tokenData.refresh_token);
      if (refreshed.error) {
        console.error('Token refresh failed:', refreshed.error);
        
        // Mark credentials as expired in sync_settings
        await supabaseAdmin
          .from('sync_settings')
          .update({ google_credentials_expired: true })
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        return new Response(JSON.stringify({ error: 'Failed to refresh token. Please reconnect Google account.' }), { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
      
      const expiresIn = typeof refreshed.expires_in === 'number' ? refreshed.expires_in : 3600;
      
      // Update stored token
      await supabaseAdmin
        .from('google_oauth_tokens')
        .update({
          access_token: refreshed.access_token,
          expires_at: new Date(Date.now() + (expiresIn * 1000)).toISOString(),
        })
        .eq('id', tokenData.id);

      // Clear expired flag
      await supabaseAdmin
        .from('sync_settings')
        .update({ google_credentials_expired: false })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      accessToken = refreshed.access_token as string;
      console.log('Token refreshed successfully');
    }

    // Fetch spreadsheet data
    // NOTE: Use a wide range so we don't miss columns beyond Z (e.g., AA, AB...) like ListingID.
    // Use FORMULA render option to get hyperlink formulas instead of display values
    const range = sheetName ? `${sheetName}!A:ZZ` : 'A:ZZ';
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMULA`;
    
    console.log('Fetching from Google Sheets API:', sheetsUrl);

    const sheetsResponse = await fetch(sheetsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!sheetsResponse.ok) {
      const errorText = await sheetsResponse.text();
      console.error('Google Sheets API error:', sheetsResponse.status, errorText);
      return new Response(JSON.stringify({ error: `Failed to fetch spreadsheet data: ${sheetsResponse.status}` }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const sheetsData = await sheetsResponse.json();
    const allRows = sheetsData.values || [];

    console.log('Fetched', allRows.length, 'rows from spreadsheet');

    // Skip rows before header row (headerRow is 1-indexed)
    // If headerRow = 2, skip row 0 (first row) and start from row 1 (second row)
    const dataStartIndex = headerRow - 1;
    const rows = allRows.slice(dataStartIndex);

    console.log('After skipping to header row', headerRow, ', processing', rows.length, 'rows');
    
    // Log the detected headers (first row after skipping)
    if (rows.length > 0) {
      console.log('Detected headers:', JSON.stringify(rows[0]));
    }

    // Attempt to fetch rich-text hyperlink URLs for the "Brochure URL" column.
    // The Values API does NOT return these URLs unless they are =HYPERLINK() formulas.
    const headersRow: string[] = rows[0] || [];
    const brochureIdx = findHeaderIndex(headersRow, 'Brochure URL');
    let brochureHyperlinks: (string | undefined)[] | undefined = undefined;

    if (sheetName && brochureIdx !== -1 && rows.length > 0) {
      try {
        brochureHyperlinks = await fetchHyperlinksForColumn({
          spreadsheetId,
          sheetName,
          accessToken,
          colIndex: brochureIdx,
          startRow: headerRow,
          rowCount: rows.length,
        });
        const found = brochureHyperlinks.filter(Boolean).length;
        console.log(`Brochure URL column index=${brochureIdx}; rich-link URLs found=${found}/${brochureHyperlinks.length}`);
      } catch (e) {
        console.warn('Rich-link brochure fetch failed:', e);
      }
    }

    // Convert to CSV-like format for consistency with existing parser
    // Escape commas in cell values by quoting them
    const csvData = rows.map((row: unknown[]) => 
      row.map((cell: unknown) => {
        const str = String(cell || '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    ).join('\n');

    console.log('Sync complete, returning', rows.length, 'rows of CSV data');

    return new Response(JSON.stringify({ 
      success: true, 
      data: csvData,
      rowCount: rows.length,
      headerRow: headerRow,
      brochureHyperlinks,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in google-sheets-sync:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function refreshAccessToken(refreshToken: string): Promise<Record<string, unknown>> {
  try {
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      console.error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET for token refresh');
      return { error: 'OAuth not configured' };
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    return await response.json();
  } catch (error: unknown) {
    console.error('Token refresh error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { error: message };
  }
}
