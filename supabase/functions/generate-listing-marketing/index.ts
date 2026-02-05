 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 interface ListingData {
   address: string;
   city: string;
   submarket: string;
   deal_type: string;
   size_sf: number | null;
   warehouse_sf: number | null;
   office_sf: number | null;
   land_acres: number | null;
   clear_height_ft: number | null;
   dock_doors: number | null;
   drive_in_doors: number | null;
   asking_rent_psf: number | null;
   asking_sale_price: number | null;
   property_type: string | null;
   power: string | null;
   yard: string | null;
   zoning: string | null;
   description: string | null;
   broker_remarks: string | null;
 }
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const { listing } = await req.json() as { listing: ListingData };
     const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
     
     if (!LOVABLE_API_KEY) {
       throw new Error("LOVABLE_API_KEY is not configured");
     }
 
     // Build property context
     const propertyDetails = [];
     if (listing.size_sf) propertyDetails.push(`${listing.size_sf.toLocaleString()} SF total`);
     if (listing.warehouse_sf) propertyDetails.push(`${listing.warehouse_sf.toLocaleString()} SF warehouse`);
     if (listing.office_sf) propertyDetails.push(`${listing.office_sf.toLocaleString()} SF office`);
     if (listing.land_acres) propertyDetails.push(`${listing.land_acres} acres`);
     if (listing.clear_height_ft) propertyDetails.push(`${listing.clear_height_ft}' clear height`);
     if (listing.dock_doors) propertyDetails.push(`${listing.dock_doors} dock doors`);
     if (listing.drive_in_doors) propertyDetails.push(`${listing.drive_in_doors} drive-in doors`);
     if (listing.power) propertyDetails.push(`${listing.power} power`);
     if (listing.yard) propertyDetails.push(`${listing.yard} yard`);
     if (listing.zoning) propertyDetails.push(`${listing.zoning} zoning`);
 
     const dealType = listing.deal_type === 'sale' ? 'For Sale' : 
                      listing.deal_type === 'lease' ? 'For Lease' : 'For Sale/Lease';
 
     const systemPrompt = `You are a professional commercial real estate copywriter specializing in industrial and warehouse properties. 
 Your writing is compelling, professional, and highlights key features that matter to tenants and investors.
 Focus on practical benefits like location advantages, building specifications, and operational efficiency.
 Write in a confident, polished tone typical of top-tier brokerage marketing materials.`;
 
     const userPrompt = `Generate marketing content for this industrial property listing:
 
 Address: ${listing.address}, ${listing.city}
 Submarket: ${listing.submarket}
 Listing Type: ${dealType}
 Property Type: ${listing.property_type || 'Industrial'}
 ${propertyDetails.length > 0 ? `Key Specs: ${propertyDetails.join(', ')}` : ''}
 ${listing.asking_rent_psf ? `Asking Rent: $${listing.asking_rent_psf}/SF` : ''}
 ${listing.asking_sale_price ? `Asking Price: $${listing.asking_sale_price.toLocaleString()}` : ''}
 ${listing.description ? `Current Description: ${listing.description}` : ''}
 ${listing.broker_remarks ? `Broker Notes: ${listing.broker_remarks}` : ''}
 
 Generate the following marketing content:`;
 
     const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
       method: "POST",
       headers: {
         Authorization: `Bearer ${LOVABLE_API_KEY}`,
         "Content-Type": "application/json",
       },
       body: JSON.stringify({
         model: "google/gemini-3-flash-preview",
         messages: [
           { role: "system", content: systemPrompt },
           { role: "user", content: userPrompt }
         ],
         tools: [
           {
             type: "function",
             function: {
               name: "generate_marketing_copy",
               description: "Generate structured marketing content for a property listing",
               parameters: {
                 type: "object",
                 properties: {
                   headline: {
                     type: "string",
                     description: "A compelling 5-10 word headline for the property (e.g., 'Premium Distribution Facility in Prime Industrial Corridor')"
                   },
                   tagline: {
                     type: "string", 
                     description: "A short punchy tagline or subheadline (e.g., 'Move-In Ready | High Clear Heights | Excellent Access')"
                   },
                   description: {
                     type: "string",
                     description: "A 2-3 paragraph marketing description highlighting location, building features, and opportunity. Should be polished and professional."
                   },
                   highlights: {
                     type: "array",
                     items: { type: "string" },
                     description: "5-8 key property highlights as bullet points (e.g., '32' clear ceiling height', 'Fenced and secured yard')"
                   },
                   broker_pitch: {
                     type: "string",
                     description: "A 2-3 sentence confidential broker pitch explaining why this is a good opportunity and key selling points to emphasize"
                   }
                 },
                 required: ["headline", "tagline", "description", "highlights", "broker_pitch"],
                 additionalProperties: false
               }
             }
           }
         ],
         tool_choice: { type: "function", function: { name: "generate_marketing_copy" } }
       }),
     });
 
     if (!response.ok) {
       if (response.status === 429) {
         return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
           status: 429,
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
       }
       if (response.status === 402) {
         return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }), {
           status: 402,
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
       }
       const errorText = await response.text();
       console.error("AI gateway error:", response.status, errorText);
       throw new Error(`AI gateway error: ${response.status}`);
     }
 
     const data = await response.json();
     const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
     
     if (!toolCall?.function?.arguments) {
       throw new Error("No marketing content generated");
     }
 
     const marketingContent = JSON.parse(toolCall.function.arguments);
 
     return new Response(JSON.stringify(marketingContent), {
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   } catch (error) {
     console.error("generate-listing-marketing error:", error);
     return new Response(
       JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });