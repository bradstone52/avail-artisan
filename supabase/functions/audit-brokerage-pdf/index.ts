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
Your task is to extract ONLY the street addresses of all property listings in the document.
Return a JSON object with a single key "addresses" containing an array of strings.
Each string should be the street address as written in the document (e.g. "2827 18 Street NE").
Do NOT include city, province, or postal code — just the street address.
If you see unit numbers or suites, include them.
Extract ALL addresses you can find. Be thorough.`;

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
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all property street addresses from this brokerage PDF." },
              { type: "image_url", image_url: { url: `data:application/pdf;base64,${base64}` } },
            ],
          },
        ],
        tools: [extractionTool],
        tool_choice: { type: "function", function: { name: "extract_addresses" } },
        temperature: 0,
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
      throw new Error(`AI extraction failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const choice = aiData.choices?.[0];
    const toolCall = choice?.message?.tool_calls?.[0];
    const toolArgs = toolCall?.function?.arguments;

    let addresses: string[] = [];

    if (toolArgs) {
      const parsed = JSON.parse(toolArgs);
      addresses = parsed.addresses || [];
    } else {
      // Fallback: try parsing content
      const content = choice?.message?.content || "";
      const match = content.match(/\{[\s\S]*"addresses"[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        addresses = parsed.addresses || [];
      }
    }

    console.log(`Extracted ${addresses.length} addresses from PDF`);

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
