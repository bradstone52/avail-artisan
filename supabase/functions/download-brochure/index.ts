import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DownloadBrochureRequest {
  propertyId: string;
  marketListingId: string;
  listingId: string;
  brochureUrl: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extract user from token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create client with user's token for RLS
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { propertyId, marketListingId, listingId, brochureUrl } = await req.json() as DownloadBrochureRequest;

    if (!propertyId || !brochureUrl) {
      return new Response(JSON.stringify({ error: 'Property ID and brochure URL are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate URL format
    let validatedUrl: URL;
    try {
      validatedUrl = new URL(brochureUrl);
      // Check for obviously invalid URLs
      if (!['http:', 'https:'].includes(validatedUrl.protocol)) {
        return new Response(JSON.stringify({ 
          error: 'Invalid URL protocol - only HTTP/HTTPS supported',
          status: 'invalid_url',
          url: brochureUrl
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      // Check for malformed domains (like "www.j")
      if (!validatedUrl.hostname.includes('.') || validatedUrl.hostname.length < 4) {
        return new Response(JSON.stringify({ 
          error: 'Invalid URL domain',
          status: 'invalid_url',
          url: brochureUrl
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } catch (urlError) {
      return new Response(JSON.stringify({ 
        error: 'Malformed URL',
        status: 'invalid_url',
        url: brochureUrl
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Downloading brochure for property ${propertyId} from ${brochureUrl}`);

    // Use service role for storage operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the market listing for snapshot
    let listingSnapshot: any = null;
    if (marketListingId) {
      const { data: listing } = await supabase
        .from('market_listings')
        .select('*')
        .eq('id', marketListingId)
        .single();
      
      if (listing) {
        listingSnapshot = {
          listing_id: listing.listing_id,
          address: listing.address,
          status: listing.status,
          size_sf: listing.size_sf,
          asking_rate_psf: listing.asking_rate_psf,
          broker_source: listing.broker_source,
          fetched_at: new Date().toISOString()
        };
      }
    }

    // Download the PDF with browser-like headers
    console.log('Fetching brochure from URL...');
    
    let pdfResponse: Response;
    try {
      pdfResponse = await fetch(brochureUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/pdf,application/octet-stream,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': validatedUrl.origin ? `${validatedUrl.origin}/` : '',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-origin',
          'Cache-Control': 'no-cache',
        },
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
    } catch (fetchError: any) {
      console.error('Fetch error:', fetchError);
      
      // Handle network/DNS errors gracefully
      const errorMessage = fetchError.message || String(fetchError);
      let errorStatus = 'network_error';
      
      if (errorMessage.includes('dns error') || errorMessage.includes('Name or service not known')) {
        errorStatus = 'dns_error';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        errorStatus = 'timeout';
      } else if (errorMessage.includes('Connection reset') || errorMessage.includes('ECONNRESET')) {
        errorStatus = 'connection_reset';
      }
      
      return new Response(JSON.stringify({ 
        error: `Network error: ${errorMessage}`,
        status: errorStatus,
        url: brochureUrl
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle HTTP error responses
    if (!pdfResponse.ok) {
      if (pdfResponse.status === 404) {
        return new Response(JSON.stringify({ 
          error: 'Brochure not found (404)',
          status: 'not_found',
          url: brochureUrl
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else if (pdfResponse.status === 403) {
        return new Response(JSON.stringify({ 
          error: 'Access restricted - this brochure requires direct browser access',
          status: 'restricted',
          url: brochureUrl
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else if (pdfResponse.status >= 500) {
        return new Response(JSON.stringify({ 
          error: `Server error (${pdfResponse.status}) - the hosting server is having issues`,
          status: 'server_error',
          url: brochureUrl
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        return new Response(JSON.stringify({ 
          error: `HTTP ${pdfResponse.status}: ${pdfResponse.statusText}`,
          status: 'http_error',
          url: brochureUrl
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const contentType = pdfResponse.headers.get('content-type') || 'application/pdf';
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const fileSize = pdfBuffer.byteLength;

    console.log(`Downloaded ${fileSize} bytes, content-type: ${contentType}`);

    // Generate storage path with format: address-date-v#
    // First, get the property address for the filename
    const { data: propertyData } = await supabase
      .from('properties')
      .select('address')
      .eq('id', propertyId)
      .single();
    
    // Count existing brochures for this property to determine version number
    const { count } = await supabase
      .from('property_brochures')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', propertyId);
    
    const versionNumber = (count || 0) + 1;
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Sanitize address for filename (remove special chars, replace spaces with dashes)
    const sanitizedAddress = (propertyData?.address || listingId || 'unknown')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50); // Limit length
    
    const storagePath = `${propertyId}/${sanitizedAddress}-${dateStr}-v${versionNumber}.pdf`;

    // Upload to storage
    console.log(`Uploading to storage: ${storagePath}`);
    const { error: uploadError } = await supabase.storage
      .from('property-brochures')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false // Don't overwrite - we want historical versions
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload brochure: ${uploadError.message}`);
    }

    // Create brochure record
    const { error: insertError } = await supabase
      .from('property_brochures')
      .insert({
        property_id: propertyId,
        market_listing_id: marketListingId || null,
        listing_id: listingId || null,
        original_url: brochureUrl,
        storage_path: storagePath,
        file_size: fileSize,
        listing_snapshot: listingSnapshot,
        created_by: user.id
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      // Try to clean up the uploaded file
      await supabase.storage.from('property-brochures').remove([storagePath]);
      throw new Error(`Failed to create brochure record: ${insertError.message}`);
    }

    console.log('Brochure archived successfully');

    return new Response(JSON.stringify({ 
      success: true,
      storagePath,
      fileSize
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Unexpected error in download-brochure:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Unexpected error',
      status: 'unexpected_error'
    }), {
      status: 200, // Still return 200 to avoid breaking the UI
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
