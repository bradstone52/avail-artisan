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
  existingUrl?: string;
}

// Map broker names to their domain patterns
const BROKER_DOMAINS: Record<string, string[]> = {
  "cbre": ["cbre.ca", "cbre.com"],
  "colliers": ["collierscanada.com", "colliers.com"],
  "jll": ["jll.ca", "jll.com", "us.jll.com"],
  "cushman": ["cushmanwakefield.com", "cushwake.com"],
  "avison young": ["avisonyoung.com", "avisonyoung.ca"],
  "cresa": ["cresa.com"],
  "marcus & millichap": ["marcusmillichap.com"],
  "nai": ["naicalgary.com", "naicommercial.ca"],
  "barclay": ["barclaystreet.com"],
};

function getBrokerDomains(brokerSource: string | undefined): string[] {
  if (!brokerSource) return [];
  const normalized = brokerSource.toLowerCase().trim();
  
  for (const [key, domains] of Object.entries(BROKER_DOMAINS)) {
    if (normalized.includes(key)) {
      return domains;
    }
  }
  return [];
}

function urlMatchesBroker(url: string, brokerDomains: string[]): boolean {
  if (brokerDomains.length === 0) return true; // No broker filter
  const urlLower = url.toLowerCase();
  return brokerDomains.some(domain => urlLower.includes(domain));
}

interface PerplexityResult {
  url: string;
  title?: string;
  snippet?: string;
}

interface BrochureCandidate {
  url: string;
  score: number;
  source: string;
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

    const perplexityApiKey = Deno.env.get("PERPLEXITY_API_KEY");
    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
    
    if (!perplexityApiKey) {
      return new Response(JSON.stringify({ error: "Perplexity not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!firecrawlApiKey) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get broker domains for filtering
    const brokerDomains = getBrokerDomains(broker);
    const hasBrokerFilter = brokerDomains.length > 0;
    
    console.log(`[find-brochure] Broker: ${broker || "unknown"}, domains: ${brokerDomains.join(", ") || "none"}`);

    // =====================================================
    // STEP 1: Use Perplexity to find listing pages
    // =====================================================
    // If we have a broker, target their site specifically
    const siteFilter = brokerDomains.length > 0 ? `site:${brokerDomains[0]}` : "";
    const searchQuery = `${address} ${city || ""} industrial property listing brochure ${siteFilter}`.trim();
    console.log(`[find-brochure] Step 1: Perplexity search for: ${searchQuery}`);

    const perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${perplexityApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: `You are a real estate research assistant. Find the property listing page or brochure for the given address. Return ONLY the URLs of relevant listing pages from broker websites (CBRE, Colliers, JLL, Cushman & Wakefield, Avison Young, etc). Format: Return each URL on a new line, nothing else.`
          },
          {
            role: "user",
            content: `Find the property listing page or PDF brochure for: ${address}, ${city || "Calgary"}, industrial/warehouse property. Return the most relevant broker listing page URLs.`
          }
        ],
      }),
    });

    if (!perplexityResponse.ok) {
      const errText = await perplexityResponse.text();
      console.error("[find-brochure] Perplexity error:", errText);
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Search failed. Try manual search.",
        error: "Perplexity API error"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const perplexityData = await perplexityResponse.json();
    const aiResponse = perplexityData.choices?.[0]?.message?.content || "";
    const citations = perplexityData.citations || [];
    
    console.log(`[find-brochure] Perplexity response: ${aiResponse.substring(0, 200)}...`);
    console.log(`[find-brochure] Citations: ${JSON.stringify(citations)}`);

    // Extract URLs from AI response and citations
    const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    const extractedUrls = aiResponse.match(urlPattern) || [];
    const allUrls = [...new Set([...citations, ...extractedUrls])];

    console.log(`[find-brochure] Found ${allUrls.length} URLs to check`);

    if (allUrls.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "No listing pages found. Try manual search.",
        searched: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =====================================================
    // STEP 2: Scrape each page with Firecrawl to find brochure links
    // =====================================================
    const candidates: BrochureCandidate[] = [];
    const addressParts = address.toLowerCase().split(/[\s,]+/).filter(p => p.length > 2);

    for (const pageUrl of allUrls.slice(0, 5)) { // Limit to first 5 URLs
      console.log(`[find-brochure] Step 2: Scraping ${pageUrl}`);

      try {
        const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: pageUrl,
            formats: ["links", "markdown"],
            onlyMainContent: true,
          }),
        });

        if (!scrapeResponse.ok) {
          console.log(`[find-brochure] Scrape failed for ${pageUrl}: ${scrapeResponse.status}`);
          continue;
        }

        const scrapeData = await scrapeResponse.json();
        const links: string[] = scrapeData.data?.links || scrapeData.links || [];
        const markdown: string = scrapeData.data?.markdown || scrapeData.markdown || "";
        const markdownLower = markdown.toLowerCase();

        console.log(`[find-brochure] Found ${links.length} links on page`);

        // Check if page mentions "brochure" or similar
        const hasBrochureMention = markdownLower.includes("brochure") || 
                                    markdownLower.includes("download") ||
                                    markdownLower.includes("flyer") ||
                                    markdownLower.includes("pdf");

        // Score each link found on the page
        for (const link of links) {
          const linkLower = link.toLowerCase();
          let score = 0;

          // PDF links are highly valuable
          if (linkLower.endsWith(".pdf")) score += 60;
          
          // BROKER MATCHING - Critical for accuracy
          const matchesExpectedBroker = urlMatchesBroker(link, brokerDomains);
          
          if (hasBrokerFilter) {
            if (matchesExpectedBroker) {
              // Big bonus for matching the expected broker
              score += 50;
              console.log(`[find-brochure] +50 broker match: ${link}`);
            } else {
              // Heavy penalty for wrong broker - but don't skip entirely
              score -= 100;
              console.log(`[find-brochure] -100 wrong broker: ${link}`);
            }
          }
          
          // Must be from a broker site or the same domain
          const isBrokerSite = linkLower.includes("cbre.") || linkLower.includes("colliers.") ||
                              linkLower.includes("jll.") || linkLower.includes("cushwake.") ||
                              linkLower.includes("cushmanwakefield.") || linkLower.includes("avisonyoung.") ||
                              linkLower.includes("cresa.") || linkLower.includes("nai") ||
                              linkLower.includes("barclay");
          
          if (!isBrokerSite && !linkLower.includes(new URL(pageUrl).hostname)) {
            continue; // Skip external non-broker links
          }

          // Brochure keywords in URL
          if (linkLower.includes("brochure")) score += 30;
          if (linkLower.includes("flyer")) score += 20;
          if (linkLower.includes("download")) score += 10;

          // Address match in URL
          for (const part of addressParts) {
            if (linkLower.includes(part)) score += 15;
          }

          // Bonus if page itself mentions brochure
          if (hasBrochureMention) score += 10;

          // Only add if score is positive (wrong broker will be negative)
          if (score >= 20) {
            candidates.push({ url: link, score, source: pageUrl });
          }
        }

        // Also check if the page URL itself is a PDF
        if (pageUrl.toLowerCase().endsWith(".pdf")) {
          let pageScore = 60;
          const matchesExpectedBroker = urlMatchesBroker(pageUrl, brokerDomains);
          if (hasBrokerFilter && matchesExpectedBroker) {
            pageScore += 50;
          } else if (hasBrokerFilter && !matchesExpectedBroker) {
            pageScore -= 100;
          }
          for (const part of addressParts) {
            if (pageUrl.toLowerCase().includes(part)) pageScore += 15;
          }
          if (pageScore >= 20) {
            candidates.push({ url: pageUrl, score: pageScore, source: "direct" });
          }
        }

      } catch (scrapeErr) {
        console.error(`[find-brochure] Error scraping ${pageUrl}:`, scrapeErr);
        continue;
      }
    }

    console.log(`[find-brochure] Found ${candidates.length} brochure candidates`);

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Found listing pages but no brochure links. Try manual search.",
        searched: true,
        pagesChecked: allUrls.slice(0, 5),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);
    const bestMatch = candidates[0];

    console.log(`[find-brochure] Best match: ${bestMatch.url} (score: ${bestMatch.score})`);

    // =====================================================
    // STEP 3: Validate the link
    // =====================================================
    try {
      const validateResponse = await fetch(bestMatch.url, {
        method: "HEAD",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      // Accept 200, 403 (restricted but exists), or redirects
      if (!validateResponse.ok && validateResponse.status !== 403 && validateResponse.status !== 301 && validateResponse.status !== 302) {
        console.log(`[find-brochure] Link validation failed: ${validateResponse.status}`);
        
        // Try next best candidate
        if (candidates.length > 1) {
          const secondBest = candidates[1];
          console.log(`[find-brochure] Trying second best: ${secondBest.url}`);
          bestMatch.url = secondBest.url;
          bestMatch.score = secondBest.score;
        } else {
          return new Response(JSON.stringify({ 
            success: false, 
            message: "Found a brochure link but it appears broken. Try manual search.",
            candidateUrl: bestMatch.url,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } catch (validateErr) {
      console.error("[find-brochure] Validation error:", validateErr);
      // Continue anyway - some sites block HEAD requests
    }

    // =====================================================
    // STEP 4: Save to database
    // =====================================================
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
      score: bestMatch.score,
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
