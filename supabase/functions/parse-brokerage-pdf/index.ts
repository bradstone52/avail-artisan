import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractedListing {
  address: string;
  city?: string;
  submarket?: string;
  size_sf?: number;
  clear_height_ft?: number;
  dock_doors?: number;
  drive_in_doors?: number;
  asking_rate_psf?: string;
  availability_date?: string;
  landlord?: string;
  broker_source?: string;
  listing_type?: string;
  notes_public?: string;
  yard?: string;
  sprinkler?: string;
  power_amps?: string;
  trailer_parking?: string;
  cross_dock?: string;
}

function extractJsonObjectFromText(text: string): string {
  const trimmed = (text || "").trim();
  if (!trimmed) return "";

  // Try fenced blocks first
  const match =
    trimmed.match(/```json\s*([\s\S]*?)\s*```/) ||
    trimmed.match(/```\s*([\s\S]*?)\s*```/);
  if (match?.[1]) return match[1].trim();

  // Heuristic fallback: take outermost JSON object
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }

  return trimmed;
}

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const brokerageId = formData.get("brokerage_id") as string | null;
    const brokerageName = formData.get("brokerage_name") as string | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get or create brokerage profile
    let brokerage: { id: string; name: string; extraction_hints: Record<string, unknown> } | null = null;

    if (brokerageId) {
      const { data } = await supabase
        .from("brokerage_profiles")
        .select("*")
        .eq("id", brokerageId)
        .maybeSingle();
      brokerage = data;
    } else if (brokerageName) {
      // Check if exists
      const { data: existing } = await supabase
        .from("brokerage_profiles")
        .select("*")
        .eq("name", brokerageName.toLowerCase().replace(/\s+/g, "_"))
        .maybeSingle();

      if (existing) {
        brokerage = existing;
      } else {
        // Create new
        const { data: created, error: createError } = await supabase
          .from("brokerage_profiles")
          .insert({
            name: brokerageName.toLowerCase().replace(/\s+/g, "_"),
            display_name: brokerageName,
            created_by: userId,
          })
          .select()
          .single();

        if (createError) throw createError;
        brokerage = created;
      }
    }

    // Create import batch
    const { data: batch, error: batchError } = await supabase
      .from("pdf_import_batches")
      .insert({
        brokerage_id: brokerage?.id,
        filename: file.name,
        status: "processing",
        created_by: userId,
      })
      .select()
      .single();

    if (batchError) throw batchError;

    // Convert PDF to base64 for AI processing (chunked to avoid stack overflow)
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to base64 in chunks to avoid "Maximum call stack size exceeded"
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binary);

    // Build extraction prompt with brokerage hints if available
    const hints = brokerage?.extraction_hints || {};
    const hintsPrompt = Object.keys(hints).length > 0
      ? `\n\nPrevious extraction hints for this brokerage:\n${JSON.stringify(hints, null, 2)}`
      : "";

    const systemPrompt = `You are an expert at extracting commercial real estate listing data from brokerage PDF documents.
Extract ALL property listings from the document.

Return either:
1) A function/tool call named \"extract_listings\" with arguments matching the schema, OR
2) If tool calling fails, return ONLY a valid JSON object (no markdown) with keys: listings, extraction_notes, brokerage_format_hints.

Focus on precision and completeness. Do not add commentary.${hintsPrompt}`;

    // Define the tool for structured extraction
    const extractionTool = {
      type: "function",
      function: {
        name: "extract_listings",
        description: "Extract all commercial real estate listings from the PDF document",
        parameters: {
          type: "object",
          properties: {
            listings: {
              type: "array",
              description: "Array of extracted listings",
              items: {
                type: "object",
                properties: {
                  address: { type: "string", description: "Full street address" },
                  city: { type: "string", description: "City name" },
                  submarket: { type: "string", description: "Neighborhood or area" },
                  size_sf: { type: "number", description: "Total square footage" },
                  clear_height_ft: { type: "number", description: "Clear height in feet" },
                  dock_doors: { type: "number", description: "Number of dock doors" },
                  drive_in_doors: { type: "number", description: "Number of drive-in doors" },
                  asking_rate_psf: { type: "string", description: "Asking rate per SF" },
                  availability_date: { type: "string", description: "When available" },
                  landlord: { type: "string", description: "Property owner" },
                  broker_source: { type: "string", description: "Listing broker" },
                  listing_type: { type: "string", description: "Lease, Sale, or Sublease" },
                  notes_public: { type: "string", description: "Additional notes" },
                  yard: { type: "string", description: "Yard info" },
                  sprinkler: { type: "string", description: "Sprinkler system" },
                  power_amps: { type: "string", description: "Electrical capacity" },
                  trailer_parking: { type: "string", description: "Trailer parking info" },
                  cross_dock: { type: "string", description: "Cross dock (Yes/No)" },
                },
                required: ["address"],
                additionalProperties: false,
              },
            },
            extraction_notes: { type: "string", description: "Notes about the extraction" },
            brokerage_format_hints: { type: "object", description: "Format patterns noticed" },
          },
          required: ["listings"],
          additionalProperties: false,
        },
      },
    };

    const gatewayUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";

    const makeAiRequest = async (body: Record<string, unknown>) => {
      const resp = await fetch(gatewayUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      return resp;
    };

    const baseMessages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Please extract all commercial real estate listings from this PDF document.",
          },
          {
            type: "image_url",
            image_url: {
              url: `data:application/pdf;base64,${base64}`,
            },
          },
        ],
      },
    ];

    // IMPORTANT: Do NOT ask for raw JSON. Gemini can include markdown/reasoning and/or hit MAX_TOKENS,
    // which produces truncated/invalid JSON and breaks parsing. Instead, force a tool call so the
    // response is structured and machine-parseable.
    const toolSystemPrompt = `${systemPrompt}

CRITICAL INSTRUCTIONS:
1) You MUST call the tool "extract_listings".
2) Return ONLY the fields in the tool schema. Do NOT add extra keys (e.g. contacts, lease_rate objects, etc.).
3) If a field is unknown, omit it.
4) Extract ALL listings you can find in the document.`;

    const toolMessages = [
      { role: "system", content: toolSystemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract all listings from this brokerage PDF using the tool.",
          },
          {
            type: "image_url",
            image_url: {
              url: `data:application/pdf;base64,${base64}`,
            },
          },
        ],
      },
    ];

    let aiResponse = await makeAiRequest({
      // Default to the recommended fast model; tool-calling here is much more reliable than raw JSON.
      model: "google/gemini-3-flash-preview",
      messages: toolMessages,
      tools: [extractionTool],
      tool_choice: { type: "function", function: { name: "extract_listings" } },
      temperature: 0,
      // Keep this high enough for many listings, but tool output is compact compared to raw prose.
      max_tokens: 12000,
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
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI extraction failed: ${errorText}`);
    }

    let aiData = await aiResponse.json();
    let choice = aiData.choices?.[0];

    console.log("AI response finish_reason:", choice?.finish_reason, choice?.native_finish_reason);

    // Extract data from tool call (preferred). Fallback to JSON extraction only if tool call is missing.
    let parsedResult: {
      listings: ExtractedListing[];
      extraction_notes?: string;
      brokerage_format_hints?: Record<string, unknown>;
    };

    try {
      const toolCall = choice?.message?.tool_calls?.[0];
      const toolArgs = toolCall?.function?.arguments;

      if (toolArgs) {
        parsedResult = JSON.parse(toolArgs);
      } else {
        // Retry once with a different model (sometimes Gemini returns MALFORMED_FUNCTION_CALL or no tool_calls)
        console.error(
          "AI did not return tool_calls. Retrying with google/gemini-2.5-flash. Finish reason:",
          choice?.finish_reason,
          choice?.native_finish_reason,
        );

        aiResponse = await makeAiRequest({
          model: "google/gemini-2.5-flash",
          messages: toolMessages,
          tools: [extractionTool],
          tool_choice: { type: "function", function: { name: "extract_listings" } },
          temperature: 0,
          max_tokens: 12000,
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error("AI Gateway retry error:", aiResponse.status, errorText);
          throw new Error(`AI extraction failed: ${errorText}`);
        }

        aiData = await aiResponse.json();
        choice = aiData.choices?.[0];
        const retryToolCall = choice?.message?.tool_calls?.[0];
        const retryArgs = retryToolCall?.function?.arguments;

        if (retryArgs) {
          parsedResult = JSON.parse(retryArgs);
        } else {
          // Absolute last resort: attempt JSON extraction from message content.
          const content = choice?.message?.content || "";
          console.log("Fallback raw AI content (first 500 chars):", content.substring(0, 500));
          const jsonStr = extractJsonObjectFromText(content);
          if (!jsonStr) throw new Error("Could not extract JSON from AI response");
          parsedResult = JSON.parse(jsonStr);
        }
      }

      if (!parsedResult.listings) parsedResult.listings = [];
      console.log("Successfully parsed", parsedResult.listings.length, "listings");
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("AI response data:", JSON.stringify(aiData, null, 2));
      throw new Error("Failed to parse AI extraction results");
    }

    const listings = parsedResult.listings || [];

    // Update brokerage hints if new patterns found
    if (brokerage && parsedResult.brokerage_format_hints) {
      await supabase
        .from("brokerage_profiles")
        .update({
          extraction_hints: {
            ...brokerage.extraction_hints,
            ...parsedResult.brokerage_format_hints,
          },
        })
        .eq("id", brokerage.id);
    }

    // Match extracted listings against existing market_listings
    const stagingRecords = [];

    for (const listing of listings) {
      // Try to find matching listing by address similarity
      let matchedId: string | null = null;
      let matchConfidence = 0;

      if (listing.address) {
        const normalizedAddress = listing.address.toLowerCase().trim();

        const { data: potentialMatches } = await supabase
          .from("market_listings")
          .select("id, address, display_address, size_sf")
          .ilike("address", `%${normalizedAddress.split(" ")[0]}%`)
          .limit(10);

        if (potentialMatches && potentialMatches.length > 0) {
          // Simple matching: check address similarity
          for (const match of potentialMatches) {
            const existingAddr = (match.address || "").toLowerCase();
            if (existingAddr.includes(normalizedAddress) || normalizedAddress.includes(existingAddr)) {
              matchedId = match.id;
              // Higher confidence if size also matches
              if (listing.size_sf && match.size_sf && Math.abs(listing.size_sf - match.size_sf) < 1000) {
                matchConfidence = 0.95;
              } else {
                matchConfidence = 0.7;
              }
              break;
            }
          }
        }
      }

      stagingRecords.push({
        import_batch_id: batch.id,
        brokerage_id: brokerage?.id,
        source_filename: file.name,
        extracted_data: listing,
        matched_listing_id: matchedId,
        match_confidence: matchConfidence,
        import_status: "pending",
        created_by: userId,
      });
    }

    // Insert staging records
    if (stagingRecords.length > 0) {
      const { error: stagingError } = await supabase
        .from("pdf_import_staging")
        .insert(stagingRecords);

      if (stagingError) throw stagingError;
    }

    // Update batch with counts
    await supabase
      .from("pdf_import_batches")
      .update({
        total_listings: listings.length,
        status: "ready_for_review",
      })
      .eq("id", batch.id);

    return new Response(
      JSON.stringify({
        success: true,
        batch_id: batch.id,
        total_extracted: listings.length,
        extraction_notes: parsedResult.extraction_notes,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Parse brokerage PDF error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
