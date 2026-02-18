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

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert PDF to base64 in chunks
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binary);

    const systemPrompt = `You are an expert at reading commercial real estate brokerage PDF documents.
Your task is to extract every property listing ROW from every table in the document.

IMPORTANT RULES:
1. Look at EVERY page, including title pages, lease pages, sale pages, and land pages.
2. Each TABLE ROW is one listing. Extract one entry per row.
3. If a listing has multiple bays/units at the same address (e.g. "4800 104 Avenue SE" with bays 109, 113, 125, 129), that is ONE listing row — extract the street address ONCE for that row.
4. If the SAME address appears in BOTH the "For Lease" section AND the "For Sale" section, extract it TWICE — once for each section with the appropriate listing_type.
5. Strip prefixes like "Conditionally Sold", "Conditionally Leased", "New Listing", "End Cap Unit Available", "Sublease" from the address — but note the listing type.
6. Include unit numbers if they identify a distinct listing row (e.g. "Unit 206 2340 Pegasus Way NE" is separate from "Unit 123 2340 Pegasus Way NE").
7. For land listings, include the name/description as written (e.g. "Eastridge Logistics Park Airdrie", "285060 Township Road 244").
8. For out-of-town listings, include the city (e.g. "585 41 Street North Lethbridge, AB").
9. For named developments without a street address, use the name (e.g. "Midway Industrial Park Crossfield", "Noble Business Park Mountain View County").
10. Do NOT skip any listing row. Check every table row on every page.

ADDRESS EXTRACTION — CRITICAL:
- Calgary addresses often have TWO numbers: a HOUSE/BUILDING number followed by a STREET number. For example "2806 116 Avenue NE" means house 2806 on 116 Avenue NE. You MUST keep BOTH numbers. NEVER drop the house number.
- More examples: "2806 116 Avenue NE" must NOT become "116 Avenue NE" or "16 Avenue NE". "1016 68 Avenue SE" must NOT become "68 Avenue SE". "11500 35 Street SE" must NOT become "35 Street SE".
- The house/building number is ALWAYS the FIRST number in the address. It can be 2-5 digits. The street number/name follows it.
- Double-check every extracted address against the original PDF text character by character. The extracted address must match the PDF exactly.

LISTING TYPE RULES:
- Use "Lease" for standard for-lease listings
- Use "Sublease" if the comments mention sublease or the listing is marked as a sublease
- Use "Sale" for for-sale listings
- Use "Land Lease" for land-only lease listings
- Use "Land Sale" for land-only sale listings
- The section headers tell you the type: "For Lease", "For Sale", "Land ... For Sale", "Land ... For Lease"

EXTRACTION RULES for additional fields:
- Extract the total building size in SF if shown (e.g. "50,000" -> 50000)
- Extract the asking rate/price if shown (lease rate PSF or sale price)
- Extract the city/submarket if identifiable
- Extract the landlord/owner name if shown in the table. NOTE: The brokerage that produced this PDF is NOT the landlord — the landlord is the property owner/developer listed separately in the table columns (e.g. "Owner", "Landlord").
- Extract any brochure or listing URL/link if shown in the table or associated with the listing row
- If a field is not visible or not applicable, use null

You should return one entry per table row. The total count should match the number of table rows across all pages.`;

    const extractionTool = {
      type: "function",
      function: {
        name: "extract_listings",
        description: "Extract all listing rows from the brokerage PDF with their addresses, types, and available details",
        parameters: {
          type: "object",
          properties: {
            listings: {
              type: "array",
              description: "Array of listing entries found in the PDF, one per table row",
              items: {
                type: "object",
                properties: {
                  address: { type: "string", description: "The street address or property name" },
                  listing_type: { type: "string", enum: ["Lease", "Sublease", "Sale", "Land Lease", "Land Sale"], description: "The type of listing" },
                  size_sf: { type: ["number", "null"], description: "Total building size in square feet, or null if not shown" },
                  asking_rate: { type: ["string", "null"], description: "Asking lease rate PSF or sale price as shown in the PDF, or null" },
                  city: { type: ["string", "null"], description: "City name if identifiable, or null" },
                  submarket: { type: ["string", "null"], description: "Submarket/area name if shown, or null" },
                  landlord: { type: ["string", "null"], description: "Landlord/owner name if shown in the table, or null" },
                  brochure_link: { type: ["string", "null"], description: "URL/link to the property brochure or listing page if shown in the PDF, or null" },
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

    const requestBody = (model: string) => JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract every listing row from this brokerage PDF. Each table row is one listing. If the same address appears in both 'For Lease' and 'For Sale' sections, include it twice with the appropriate listing_type. Include all available fields (size, rate, city, landlord) for each entry." },
            { type: "image_url", image_url: { url: `data:application/pdf;base64,${base64}` } },
          ],
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

      // Try next model on 503/5xx errors
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

    let listings: { address: string; listing_type: string; size_sf?: number | null; asking_rate?: string | null; city?: string | null; submarket?: string | null; landlord?: string | null; brochure_link?: string | null }[] = [];

    if (toolArgs) {
      const parsed = JSON.parse(toolArgs);
      listings = parsed.listings || [];
    } else {
      // Fallback: try parsing content
      const content = choice?.message?.content || "";
      const match = content.match(/\{[\s\S]*"listings"[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        listings = parsed.listings || [];
      }
    }

    // Also extract flat addresses array for backward compatibility
    const addresses = listings.map(l => l.address);

    console.log(`Extracted ${listings.length} listing rows from PDF`);

    return new Response(
      JSON.stringify({ success: true, listings, addresses }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Audit brokerage PDF error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
