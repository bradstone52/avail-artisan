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

    // Helper function to try Firecrawl as fallback for restricted PDFs
    async function tryFirecrawlFallback(url: string): Promise<{ buffer: ArrayBuffer; contentType: string } | null> {
      const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
      if (!firecrawlApiKey) {
        console.log('Firecrawl API key not configured, skipping fallback');
        return null;
      }

      console.log('Attempting Firecrawl fallback for restricted URL...');
      try {
        const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: url,
            formats: ['rawHtml'],
            waitFor: 3000,
            onlyMainContent: false,
          }),
        });

        if (!firecrawlResponse.ok) {
          console.log(`Firecrawl returned ${firecrawlResponse.status}`);
          return null;
        }

        const firecrawlData = await firecrawlResponse.json();
        
        // Check if Firecrawl returned PDF content directly
        // Some PDF URLs when scraped will have the raw binary in the response
        if (firecrawlData.data?.rawHtml) {
          // If the rawHtml looks like a PDF (starts with %PDF), convert it
          const rawContent = firecrawlData.data.rawHtml;
          if (rawContent.startsWith('%PDF')) {
            const encoder = new TextEncoder();
            return { 
              buffer: encoder.encode(rawContent).buffer, 
              contentType: 'application/pdf' 
            };
          }
        }

        // Try to find a direct PDF link in the scraped content and fetch it
        // Sometimes the page redirects or embeds the PDF
        if (firecrawlData.data?.links) {
          const pdfLink = firecrawlData.data.links.find((link: string) => 
            link.toLowerCase().endsWith('.pdf')
          );
          if (pdfLink && pdfLink !== url) {
            console.log(`Found alternate PDF link via Firecrawl: ${pdfLink}`);
            const altResponse = await fetch(pdfLink, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/pdf,*/*',
              },
              signal: AbortSignal.timeout(30000)
            });
            if (altResponse.ok) {
              return {
                buffer: await altResponse.arrayBuffer(),
                contentType: altResponse.headers.get('content-type') || 'application/pdf'
              };
            }
          }
        }

        console.log('Firecrawl did not yield usable PDF content');
        return null;
      } catch (err) {
        console.error('Firecrawl fallback error:', err);
        return null;
      }
    }

    // Download the PDF with browser-like headers
    console.log('Fetching brochure from URL...');
    
    let pdfBuffer: ArrayBuffer;
    let contentType: string = 'application/pdf';
    let usedFallback = false;
    
    let pdfResponse: Response | null = null;
    let directFetchFailed = false;
    let directFetchStatus = 0;
    
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
        signal: AbortSignal.timeout(30000)
      });
      
      if (!pdfResponse.ok) {
        directFetchFailed = true;
        directFetchStatus = pdfResponse.status;
      }
    } catch (fetchError: any) {
      console.error('Direct fetch error:', fetchError);
      directFetchFailed = true;
      
      // Handle network/DNS errors - try Firecrawl fallback
      const errorMessage = fetchError.message || String(fetchError);
      
      if (errorMessage.includes('dns error') || errorMessage.includes('Name or service not known')) {
        return new Response(JSON.stringify({ 
          error: `DNS error: ${errorMessage}`,
          status: 'dns_error',
          url: brochureUrl
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // If direct fetch failed with 403 or similar, try Firecrawl fallback
    if (directFetchFailed && (directFetchStatus === 403 || directFetchStatus === 401 || directFetchStatus === 0)) {
      console.log(`Direct fetch failed (${directFetchStatus}), trying Firecrawl fallback...`);
      const fallbackResult = await tryFirecrawlFallback(brochureUrl);
      
      if (fallbackResult) {
        pdfBuffer = fallbackResult.buffer;
        contentType = fallbackResult.contentType;
        usedFallback = true;
        console.log(`Firecrawl fallback succeeded! Got ${pdfBuffer.byteLength} bytes`);
      } else {
        // Firecrawl also failed - return appropriate error
        if (directFetchStatus === 403) {
          return new Response(JSON.stringify({ 
            error: 'Access restricted - even with browser emulation, this brochure cannot be downloaded automatically',
            status: 'restricted',
            url: brochureUrl
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify({ 
          error: 'Failed to download brochure after all attempts',
          status: 'failed',
          url: brochureUrl
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else if (directFetchFailed) {
      // Handle other HTTP errors
      if (directFetchStatus === 404) {
        return new Response(JSON.stringify({ 
          error: 'Brochure not found (404)',
          status: 'not_found',
          url: brochureUrl
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else if (directFetchStatus >= 500) {
        return new Response(JSON.stringify({ 
          error: `Server error (${directFetchStatus}) - the hosting server is having issues`,
          status: 'server_error',
          url: brochureUrl
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        return new Response(JSON.stringify({ 
          error: `HTTP ${directFetchStatus}`,
          status: 'http_error',
          url: brochureUrl
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else if (pdfResponse) {
      // Direct fetch succeeded
      contentType = pdfResponse.headers.get('content-type') || 'application/pdf';
      pdfBuffer = await pdfResponse.arrayBuffer();
    } else {
      return new Response(JSON.stringify({ 
        error: 'Unexpected error during download',
        status: 'unexpected_error',
        url: brochureUrl
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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

    // Create brochure record with download method
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
        created_by: user.id,
        download_method: usedFallback ? 'firecrawl' : 'direct'
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
      fileSize,
      downloadMethod: usedFallback ? 'firecrawl' : 'direct'
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
