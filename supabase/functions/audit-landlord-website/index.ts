import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlApiKey) {
      throw new Error("FIRECRAWL_API_KEY is not configured");
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { url, landlord_name } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Crawling landlord website: ${url} for ${landlord_name}`);

    // Step 1: Use Firecrawl to crawl the website
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // First, map the site to discover listing-related pages
    const mapResponse = await fetch("https://api.firecrawl.dev/v1/map", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        search: "available lease sale industrial warehouse space listings",
        limit: 50,
        includeSubdomains: true,
      }),
    });

    const mapData = await mapResponse.json();
    if (!mapResponse.ok) {
      console.error("Firecrawl map error:", mapData);
      throw new Error(`Failed to map website: ${mapData.error || mapResponse.status}`);
    }

    const discoveredUrls: string[] = mapData.links || [];
    console.log(`Discovered ${discoveredUrls.length} URLs from site map`);

    // Filter to likely listing pages
    const listingKeywords = [
      "available", "lease", "sale", "listing", "properties", "industrial",
      "warehouse", "space", "vacancy", "commercial", "inventory",
    ];
    const relevantUrls = discoveredUrls.filter((u: string) => {
      const lower = u.toLowerCase();
      return listingKeywords.some((kw) => lower.includes(kw)) || lower === formattedUrl.toLowerCase();
    });

    // Always include the root URL and limit to top 10
    const urlsToScrape = [formattedUrl, ...relevantUrls.filter((u: string) => u !== formattedUrl)].slice(0, 10);
    console.log(`Scraping ${urlsToScrape.length} relevant pages`);

    // Step 2: Scrape the relevant pages
    const allPageContent: string[] = [];

    for (const pageUrl of urlsToScrape) {
      try {
        const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firecrawlApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: pageUrl,
            formats: ["markdown"],
            onlyMainContent: true,
            waitFor: 3000,
          }),
        });

        const scrapeData = await scrapeResponse.json();
        if (scrapeResponse.ok) {
          const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
          if (markdown) {
            allPageContent.push(`--- PAGE: ${pageUrl} ---\n${markdown}`);
          }
        } else {
          console.warn(`Failed to scrape ${pageUrl}: ${scrapeData.error || scrapeResponse.status}`);
        }
      } catch (e) {
        console.warn(`Error scraping ${pageUrl}:`, e);
      }
    }

    if (allPageContent.length === 0) {
      return new Response(
        JSON.stringify({ success: true, listings: [], addresses: [], message: "No content found on the website" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const combinedContent = allPageContent.join("\n\n");
    // Truncate to avoid token limits (~100k chars ≈ 25k tokens)
    const truncated = combinedContent.substring(0, 100000);

    console.log(`Total scraped content: ${combinedContent.length} chars (truncated to ${truncated.length})`);

    // Step 3: Use AI to extract listings from the crawled content
    const systemPrompt = `You are an expert at reading commercial real estate landlord websites.
Your task is to extract every available property listing from the website content.

IMPORTANT RULES:
1. Extract EVERY property listing mentioned on the pages — for lease, for sale, or land.
2. Each distinct property/unit/bay is one listing entry.
3. Extract the street address or property name for each listing.
4. Identify the listing type: Lease, Sublease, Sale, Land Lease, or Land Sale.
5. Extract any available details: size (SF), asking rate, city, submarket.
6. The landlord for all listings is "${landlord_name || "Unknown"}".
7. Extract any brochure or listing page URLs if referenced.
8. Do NOT include properties that are already leased/sold/unavailable — only currently available space.
9. If the same building has multiple available units/bays, extract each separately if they have distinct sizes.
10. If a property appears on multiple pages with the same details, include it only once.
11. Include land listings if any are shown as available.
12. For named developments without a street address, use the development name as the address.
13. IMPORTANT: If a listing is part of a named development or industrial park (e.g., "StoneGate Industrial", "Balzac Business Park", "CrossIron Mills Commerce"), extract the development/project name in the "development_name" field. This applies even if the listing has a specific street address — capture the parent development name.

ADDRESS EXTRACTION — CRITICAL:
- Calgary addresses often have TWO numbers: a HOUSE/BUILDING number followed by a STREET number. For example "2806 116 Avenue NE" means house 2806 on 116 Avenue NE. You MUST keep BOTH numbers. NEVER drop the house number.
- More examples: "2806 116 Avenue NE" must NOT become "116 Avenue NE" or "16 Avenue NE". "1016 68 Avenue SE" must NOT become "68 Avenue SE". "11500 35 Street SE" must NOT become "35 Street SE".
- The house/building number is ALWAYS the FIRST number in the address. It can be 2-5 digits. The street number/name follows it.
- Double-check every extracted address against the original source content character by character.`;

    const extractionTool = {
      type: "function",
      function: {
        name: "extract_listings",
        description: "Extract all available listing entries from the landlord website content",
        parameters: {
          type: "object",
          properties: {
            listings: {
              type: "array",
              description: "Array of available property listings found on the website",
              items: {
                type: "object",
                properties: {
                  address: { type: "string", description: "The street address or property/development name" },
                  listing_type: { type: "string", enum: ["Lease", "Sublease", "Sale", "Land Lease", "Land Sale"], description: "The type of listing" },
                  size_sf: { type: ["number", "null"], description: "Total size in square feet, or null if not shown" },
                  asking_rate: { type: ["string", "null"], description: "Asking lease rate PSF or sale price as shown, or null" },
                  city: { type: ["string", "null"], description: "City name if identifiable, or null" },
                  submarket: { type: ["string", "null"], description: "Submarket/area name if shown, or null" },
                  brochure_link: { type: ["string", "null"], description: "URL to a brochure or listing detail page, or null" },
                  development_name: { type: ["string", "null"], description: "Name of the parent development, industrial park, or business park this listing belongs to (e.g., 'StoneGate Industrial', 'Balzac Business Park'), or null if standalone" },
                },
                required: ["address", "listing_type"],
              },
            },
          },
          required: ["listings"],
          additionalProperties: false,
        },
      },
    };

    const gatewayUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
    const models = ["google/gemini-2.5-pro", "google/gemini-2.5-flash", "openai/gpt-5-mini"];

    const requestBody = (model: string) =>
      JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Extract every currently available property listing from this landlord website content. Only include available/vacant space — exclude anything marked as leased, sold, or unavailable.\n\n${truncated}`,
          },
        ],
        tools: [extractionTool],
        tool_choice: { type: "function", function: { name: "extract_listings" } },
        temperature: 0,
        max_tokens: 16000,
      });

    let aiResponse: Response | null = null;
    for (const model of models) {
      console.log(`Trying model: ${model}`);
      const resp = await fetch(gatewayUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: requestBody(model),
      });

      if (resp.ok) {
        aiResponse = resp;
        console.log(`Success with model: ${model}`);
        break;
      }

      const errorText = await resp.text();
      console.error(`Model ${model} failed: ${resp.status} ${errorText}`);

      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (resp.status < 500) {
        throw new Error(`AI extraction failed: ${errorText}`);
      }
    }

    if (!aiResponse) {
      throw new Error("All AI models are currently unavailable. Please try again later.");
    }

    const aiData = await aiResponse.json();
    const choice = aiData.choices?.[0];
    const toolCall = choice?.message?.tool_calls?.[0];
    const toolArgs = toolCall?.function?.arguments;

    let listings: {
      address: string;
      listing_type: string;
      size_sf?: number | null;
      asking_rate?: string | null;
      city?: string | null;
      submarket?: string | null;
      brochure_link?: string | null;
      development_name?: string | null;
    }[] = [];

    if (toolArgs) {
      const parsed = JSON.parse(toolArgs);
      listings = parsed.listings || [];
    } else {
      const content = choice?.message?.content || "";
      const match = content.match(/\{[\s\S]*"listings"[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        listings = parsed.listings || [];
      }
    }

    // Add landlord to all listings
    listings = listings.map((l) => ({ ...l, landlord: landlord_name || null }));

    const addresses = listings.map((l) => l.address);

    console.log(`Extracted ${listings.length} listings from website`);

    return new Response(
      JSON.stringify({
        success: true,
        listings,
        addresses,
        pages_scraped: urlsToScrape.length,
        urls_discovered: discoveredUrls.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Audit landlord website error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
