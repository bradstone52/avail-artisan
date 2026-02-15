import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Parse form data
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
Your task is to extract the street address of every UNIQUE property listing in the document.

IMPORTANT RULES:
1. Look at EVERY page, including title pages, lease pages, sale pages, and land pages.
2. Each TABLE ROW is one listing. Extract one address per row.
3. If a listing has multiple bays/units at the same address (e.g. "4800 104 Avenue SE" with bays 109, 113, 125, 129), that is ONE address — extract the street address ONCE.
4. Many listings appear in BOTH the "For Lease" AND "For Sale" sections — extract each unique address only ONCE.
5. Strip prefixes like "Conditionally Sold", "Conditionally Leased", "New Listing", "End Cap Unit Available", "Sublease" — just return the clean address.
6. Include unit numbers if they identify a distinct listing (e.g. "Unit 206 2340 Pegasus Way NE" is separate from "Unit 123 2340 Pegasus Way NE").
7. For land listings, include the name/description as written (e.g. "Eastridge Logistics Park Airdrie", "285060 Township Road 244").
8. For out-of-town listings, include the city (e.g. "585 41 Street North Lethbridge, AB").
9. For named developments without a street address, use the name (e.g. "Midway Industrial Park Crossfield", "Noble Business Park Mountain View County").
10. Do NOT skip any listing. Check every table row on every page.

Return a JSON object with a single key "addresses" containing an array of unique address strings.`;

    const extractionTool = {
      type: "function",
      function: {
        name: "extract_addresses",
        description: "Extract all street addresses from the brokerage PDF",
        parameters: {
          type: "object",
          properties: {
            addresses: {
              type: "array",
              description: "Array of street addresses found in the PDF",
              items: { type: "string" },
            },
          },
          required: ["addresses"],
          additionalProperties: false,
        },
      },
    };

    const gatewayUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";

    const aiResponse = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract every unique property address from this brokerage PDF. Each table row is one listing. If the same address appears in both 'For Lease' and 'For Sale' sections, include it only once. If a single address has multiple bays listed, count it as one address." },
              { type: "image_url", image_url: { url: `data:application/pdf;base64,${base64}` } },
            ],
          },
        ],
        tools: [extractionTool],
        tool_choice: { type: "function", function: { name: "extract_addresses" } },
        temperature: 0,
        max_tokens: 16000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI extraction failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const choice = aiData.choices?.[0];
    const toolCall = choice?.message?.tool_calls?.[0];
    const toolArgs = toolCall?.function?.arguments;

    let rawAddresses: string[] = [];

    if (toolArgs) {
      const parsed = JSON.parse(toolArgs);
      rawAddresses = parsed.addresses || [];
    } else {
      // Fallback: try parsing content
      const content = choice?.message?.content || "";
      const match = content.match(/\{[\s\S]*"addresses"[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        rawAddresses = parsed.addresses || [];
      }
    }

    // Deduplicate by normalizing addresses
    const normalize = (addr: string) =>
      addr.toLowerCase()
        .replace(/[.,#\-–—]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\b(street|st)\b/g, 'st')
        .replace(/\b(avenue|ave)\b/g, 'ave')
        .replace(/\b(road|rd)\b/g, 'rd')
        .replace(/\b(drive|dr)\b/g, 'dr')
        .replace(/\b(boulevard|blvd)\b/g, 'blvd')
        .replace(/\b(crescent|cres)\b/g, 'cres')
        .replace(/\b(northeast|n\.?e\.?)\b/g, 'ne')
        .replace(/\b(northwest|n\.?w\.?)\b/g, 'nw')
        .replace(/\b(southeast|s\.?e\.?)\b/g, 'se')
        .replace(/\b(southwest|s\.?w\.?)\b/g, 'sw')
        .trim();

    const seen = new Set<string>();
    const addresses: string[] = [];
    for (const addr of rawAddresses) {
      const key = normalize(addr);
      if (!seen.has(key)) {
        seen.add(key);
        addresses.push(addr);
      }
    }

    console.log(`Extracted ${rawAddresses.length} raw, ${addresses.length} unique addresses from PDF`);

    return new Response(
      JSON.stringify({ success: true, addresses }),
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
