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

    // Convert PDF to base64 for AI processing
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Build extraction prompt with brokerage hints if available
    const hints = brokerage?.extraction_hints || {};
    const hintsPrompt = Object.keys(hints).length > 0
      ? `\n\nPrevious extraction hints for this brokerage:\n${JSON.stringify(hints, null, 2)}`
      : "";

    const systemPrompt = `You are an expert at extracting commercial real estate listing data from brokerage PDF documents.
Extract ALL property listings from the document. For each listing, extract:
- address (required): Full street address
- city: City name
- submarket: Neighborhood or area within the city
- size_sf: Total square footage (number only)
- clear_height_ft: Clear height in feet (number only)
- dock_doors: Number of dock doors (number only)
- drive_in_doors: Number of drive-in doors (number only)
- asking_rate_psf: Asking rate per square foot (as string, include currency)
- availability_date: When available (as string)
- landlord: Property owner/landlord name
- broker_source: Listing broker name or company
- listing_type: "Lease", "Sale", or "Sublease"
- notes_public: Any additional notes or features
- yard: "Yes", "No", or description
- sprinkler: Sprinkler system info
- power_amps: Electrical capacity
- trailer_parking: "Yes", "No", or number of spaces
- cross_dock: "Yes" or "No"

Return a JSON object with:
{
  "listings": [...array of extracted listings...],
  "extraction_notes": "any notes about the extraction or document format",
  "brokerage_format_hints": {...any format patterns you noticed that could help future extractions...}
}${hintsPrompt}`;

    // Call Lovable AI with the PDF
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              {
                type: "text",
                text: "Please extract all commercial real estate listings from this PDF document. Return the data as JSON.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${base64}`,
                },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 8000,
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
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI extraction failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse AI response
    let parsedResult: {
      listings: ExtractedListing[];
      extraction_notes?: string;
      brokerage_format_hints?: Record<string, unknown>;
    };

    try {
      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      parsedResult = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
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
