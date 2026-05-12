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

    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert PDF to base64
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
3b. If a listing combines two adjacent civic addresses with "&" or "and" (e.g. "2101 & 2121 - 50th Street SE"), treat it as ONE listing row. Use the FULL combined address string as written. Do NOT split it into two rows and do NOT drop either number.
4. If the SAME address appears in BOTH the "For Lease" section AND the "For Sale" section, extract it TWICE — once for each section with the appropriate listing_type.
5. For each listing row, determine its availability status by checking ALL of the following:
   - Bold text labels in the address/title area of the row such as: LEASED, SOLD, CONDITIONALLY LEASED, CONDITIONALLY SOLD, SUBLEASED, UNCONDITIONALLY SOLD, or similar variants
   - Diagonal banner overlays or watermarks printed across the property photo (e.g. a red diagonal banner reading "UNCONDITIONALLY SOLD" or a greyed-out overlay with "Leased!" text)
   - Greyed-out or visually dimmed rows indicating the listing is no longer available
   Set status to "inactive" if ANY of the above signals are present. Set status to "active" if the listing appears to be currently available with no such indicators.
   Strip only neutral prefixes like "New Listing" or "End Cap Unit Available" from the address field — do NOT strip status labels, capture them in the status field instead.
6. Include unit numbers if they identify a distinct listing row (e.g. "Unit 206 2340 Pegasus Way NE" is separate from "Unit 123 2340 Pegasus Way NE").
7. For land listings, include the name/description as written (e.g. "Eastridge Logistics Park Airdrie").
8. For out-of-town listings, include the city (e.g. "585 41 Street North Lethbridge, AB").
9. For named developments without a street address, use the name (e.g. "Midway Industrial Park Crossfield").
10. Do NOT skip any listing row. Check every table row on every page.

ADDRESS EXTRACTION — CRITICAL:
- Calgary addresses often have TWO numbers: a HOUSE/BUILDING number followed by a STREET number. For example "2806 116 Avenue NE" means house 2806 on 116 Avenue NE. You MUST keep BOTH numbers. NEVER drop the house number.
- More examples: "2806 116 Avenue NE" must NOT become "116 Avenue NE". "1016 68 Avenue SE" must NOT become "68 Avenue SE".
- The house/building number is ALWAYS the FIRST number in the address. It can be 2-5 digits.
- Double-check every extracted address against the original PDF text character by character.

LISTING TYPE RULES:
- Use "Lease" for standard for-lease listings
- Use "Sublease" if the listing is marked as a sublease
- Use "Sale" for for-sale listings
- Use "Land Lease" for land-only lease listings
- Use "Land Sale" for land-only sale listings

EXTRACTION RULES for additional fields:
- Extract the total building size in SF if shown
- Extract the asking rate/price if shown (lease rate PSF or sale price)
- Extract the city/submarket if identifiable
- Extract the landlord/owner name if shown. The brokerage that produced this PDF is NOT the landlord.
- Extract any brochure or listing URL/link if shown
- If a field is not visible or not applicable, use null`;

    const extractionTool = {
      name: "extract_listings",
      description: "Extract all listing rows from the brokerage PDF with their addresses, types, status, and available details",
      input_schema: {
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
                status: { type: "string", enum: ["active", "inactive"], description: "Set to inactive if the row shows any sold, leased, conditionally sold, conditionally leased, subleased, or unconditionally sold indicator — either as bold text in the row or as a visual overlay/watermark on the photo. Default to active if no such indicator is present." },
                size_sf: { type: ["number", "null"], description: "Total building size in square feet, or null if not shown" },
                asking_rate: { type: ["string", "null"], description: "Asking lease rate PSF or sale price as shown in the PDF, or null" },
                city: { type: ["string", "null"], description: "City name if identifiable, or null" },
                submarket: { type: ["string", "null"], description: "Submarket/area name if shown, or null" },
                landlord: { type: ["string", "null"], description: "Landlord/owner name if shown in the table, or null" },
                brochure_link: { type: ["string", "null"], description: "URL/link to the property brochure or listing page if shown in the PDF, or null" },
              },
              required: ["address", "listing_type", "status"],
            },
          },
        },
        required: ["listings"],
      },
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 16000,
        system: systemPrompt,
        tools: [extractionTool],
        tool_choice: { type: "tool", name: "extract_listings" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64,
                },
              },
              {
                type: "text",
                text: "Extract every listing row from this brokerage PDF. Each table row is one listing. Check carefully for any visual overlays, diagonal banners, or bold status labels (LEASED, SOLD, CONDITIONALLY SOLD, UNCONDITIONALLY SOLD, etc.) on each row or its photo — mark those as inactive. If the same address appears in both 'For Lease' and 'For Sale' sections, include it twice with the appropriate listing_type.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Anthropic API error: ${response.status} ${errorText}`);
    }

    const aiData = await response.json();
    const toolUseBlock = aiData.content?.find((block: { type: string }) => block.type === "tool_use");
    const toolInput = toolUseBlock?.input;

    let listings: {
      address: string;
      listing_type: string;
      status?: string | null;
      size_sf?: number | null;
      asking_rate?: string | null;
      city?: string | null;
      submarket?: string | null;
      landlord?: string | null;
      brochure_link?: string | null;
    }[] = [];

    if (toolInput?.listings) {
      listings = toolInput.listings;
    }

    const addresses = listings.map((l) => l.address);
    console.log(`Extracted ${listings.length} total listing rows from PDF`);
    console.log(`Inactive (sold/leased): ${listings.filter(l => l.status === "inactive").length}`);

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
