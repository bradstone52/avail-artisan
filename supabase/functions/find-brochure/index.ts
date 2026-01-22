import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FindBrochureRequest {
  listingId: string;
  address: string;
  city?: string;
  broker?: string;
  existingUrl?: string; // To infer site filter from broken URL
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { listingId, address, city, broker, existingUrl }: FindBrochureRequest = await req.json();

    if (!listingId || !address) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlApiKey) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Infer site filter from existing (broken) URL if available — matches Google Sheets logic
    let siteFilter = "";
    if (existingUrl) {
      try {
        const host = new URL(existingUrl).hostname.toLowerCase();
        if (host.includes("cbre.")) siteFilter = " site:cbre.ca";
        else if (host.includes("colliers")) siteFilter = " site:collierscanada.com";
        else if (host.includes("jll")) siteFilter = " site:jll.ca";
        else if (host.includes("cushwake") || host.includes("cushmanwakefield")) siteFilter = " site:cushmanwakefield.com";
        else if (host.includes("avisonyoung")) siteFilter = " site:avisonyoung.com";
        else if (host.includes("cresa")) siteFilter = " site:cresa.com";
      } catch {
        // Invalid URL — no site filter
      }
    }

    // Build search query matching Google Sheets style: [address] [city] industrial real estate brochure
    const searchQuery = [address, city, "industrial real estate brochure"]
      .filter(Boolean)
      .join(" ") + siteFilter;

    console.log(`[find-brochure] Searching for: ${searchQuery}`);

    // Use Firecrawl search API
    const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${firecrawlApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 5,
      }),
    });

    const searchData = await searchResponse.json();

    if (!searchResponse.ok) {
      console.error("Firecrawl search error:", searchData);
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Search failed", 
        error: searchData.error 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[find-brochure] Found ${searchData.data?.length || 0} results`);

    // Look for PDF links in results
    const results = searchData.data || [];
    let bestMatch: { url: string; score: number } | null = null;

    for (const result of results) {
      const url = result.url?.toLowerCase() || "";
      const title = (result.title || "").toLowerCase();
      const description = (result.description || "").toLowerCase();
      
      // Skip if not from a broker site or doesn't look like a brochure
      const isBrokerSite = url.includes("cbre.") || url.includes("colliers.") || 
                          url.includes("jll.") || url.includes("cushwake.") ||
                          url.includes("avisonyoung.") || url.includes("cresa.");
      
      if (!isBrokerSite) continue;

      // Score the result
      let score = 0;
      
      // PDF links are best
      if (url.endsWith(".pdf")) score += 50;
      
      // Check if address appears in title/description
      const addressParts = address.toLowerCase().split(/[\s,]+/).filter(p => p.length > 3);
      for (const part of addressParts) {
        if (title.includes(part) || description.includes(part) || url.includes(part)) {
          score += 10;
        }
      }
      
      // Brochure-related keywords
      if (title.includes("brochure") || description.includes("brochure")) score += 15;
      if (title.includes("industrial") || description.includes("industrial")) score += 5;
      if (title.includes("warehouse") || description.includes("warehouse")) score += 5;
      if (title.includes("lease") || description.includes("lease")) score += 5;
      
      if (score > (bestMatch?.score || 0)) {
        bestMatch = { url: result.url, score };
      }
    }

    if (!bestMatch || bestMatch.score < 20) {
      console.log("[find-brochure] No good match found");
      return new Response(JSON.stringify({ 
        success: false, 
        message: "No brochure found. Try manual search.",
        searched: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[find-brochure] Best match: ${bestMatch.url} (score: ${bestMatch.score})`);

    // Validate the link exists
    try {
      const validateResponse = await fetch(bestMatch.url, {
        method: "HEAD",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (!validateResponse.ok && validateResponse.status !== 403) {
        console.log(`[find-brochure] Link validation failed: ${validateResponse.status}`);
        return new Response(JSON.stringify({ 
          success: false, 
          message: "Found a link but it appears to be broken. Try manual search.",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (err) {
      console.error("[find-brochure] Link validation error:", err);
      // Continue anyway - some sites block HEAD requests
    }

    // Update the listing with the found link
    const { error: updateError } = await supabase
      .from("market_listings")
      .update({
        link: bestMatch.url,
        link_status: "ok",
        link_last_checked: new Date().toISOString(),
      })
      .eq("id", listingId);

    if (updateError) {
      console.error("[find-brochure] Update error:", updateError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Failed to save link",
        link: bestMatch.url,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      link: bestMatch.url,
      message: "Brochure found and saved!",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error in find-brochure:", err);
    return new Response(JSON.stringify({ 
      error: err instanceof Error ? err.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
