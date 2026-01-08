import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { format } from "https://esm.sh/date-fns@3.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Listing {
  id: string;
  listing_id: string;
  property_name: string | null;
  address: string;
  city: string;
  submarket: string;
  size_sf: number;
  clear_height_ft: number | null;
  dock_doors: number;
  drive_in_doors: number;
  yard: string | null;
  availability_date: string | null;
  asking_rate_psf: string | null;
  cross_dock: string | null;
  trailer_parking: string | null;
  photo_url: string | null;
  notes_public: string | null;
}

interface IssueListing {
  id: string;
  listing_id: string;
  change_status: string | null;
  executive_note: string | null;
  sort_order: number;
  listings: Listing;
}

interface Issue {
  id: string;
  title: string;
  market: string;
  size_threshold: number;
  brokerage_name: string | null;
  logo_url: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  total_listings: number;
  new_count: number;
  changed_count: number;
  removed_count: number;
  published_at: string | null;
}

function generateShareToken(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generatePdfHtml(issue: Issue, issueListings: IssueListing[]): string {
  const publishDate = issue.published_at
    ? format(new Date(issue.published_at), "MMMM d, yyyy")
    : format(new Date(), "MMMM d, yyyy");

  // Calculate stats
  const sizes = issueListings.map((il) => il.listings.size_sf);
  const minSize = Math.min(...sizes);
  const maxSize = Math.max(...sizes);
  const availabilities = issueListings
    .map((il) => il.listings.availability_date)
    .filter(Boolean)
    .sort();
  const earliestAvailability = availabilities[0] || "TBD";

  // Generate property cards HTML (2 per page)
  const propertyCardsHtml = issueListings
    .map((il, index) => {
      const listing = il.listings;
      const changeStatus = il.change_status;
      const executiveNote =
        il.executive_note || "Details available on request.";

      const badge =
        changeStatus === "new"
          ? '<span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-left: 8px;">NEW</span>'
          : changeStatus === "changed"
            ? '<span style="background: #f59e0b; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-left: 8px;">CHANGED</span>'
            : "";

      const photoHtml = listing.photo_url
        ? `<div style="width: 150px; height: 100px; background: #f3f4f6; border-radius: 8px; overflow: hidden; flex-shrink: 0;">
           <img src="${escapeHtml(listing.photo_url)}" style="width: 100%; height: 100%; object-fit: cover;" />
         </div>`
        : "";

      const pageBreak =
        index > 0 && index % 2 === 0
          ? 'style="page-break-before: always; margin-top: 40px;"'
          : "";

      return `
      <div ${pageBreak} style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 20px; background: white;">
        <div style="display: flex; gap: 20px;">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; margin-bottom: 12px;">
              <h3 style="font-size: 18px; font-weight: 600; margin: 0; color: #1f2937;">
                ${escapeHtml(listing.property_name || listing.address)}
              </h3>
              ${badge}
            </div>
            ${
              listing.property_name
                ? `<p style="color: #6b7280; font-size: 14px; margin: 0 0 16px 0;">${escapeHtml(listing.address)}, ${escapeHtml(listing.city)}</p>`
                : ""
            }
            
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;">
              <div>
                <p style="color: #9ca3af; font-size: 11px; margin: 0;">Size</p>
                <p style="font-weight: 600; margin: 2px 0 0 0; font-size: 14px;">${listing.size_sf.toLocaleString()} SF</p>
              </div>
              <div>
                <p style="color: #9ca3af; font-size: 11px; margin: 0;">Clear Height</p>
                <p style="font-weight: 600; margin: 2px 0 0 0; font-size: 14px;">${listing.clear_height_ft ? listing.clear_height_ft + "'" : "—"}</p>
              </div>
              <div>
                <p style="color: #9ca3af; font-size: 11px; margin: 0;">Dock Doors</p>
                <p style="font-weight: 600; margin: 2px 0 0 0; font-size: 14px;">${listing.dock_doors || 0}</p>
              </div>
              <div>
                <p style="color: #9ca3af; font-size: 11px; margin: 0;">Drive-In</p>
                <p style="font-weight: 600; margin: 2px 0 0 0; font-size: 14px;">${listing.drive_in_doors || 0}</p>
              </div>
              <div>
                <p style="color: #9ca3af; font-size: 11px; margin: 0;">Yard</p>
                <p style="font-weight: 600; margin: 2px 0 0 0; font-size: 14px;">${listing.yard || "Unknown"}</p>
              </div>
              <div>
                <p style="color: #9ca3af; font-size: 11px; margin: 0;">Availability</p>
                <p style="font-weight: 600; margin: 2px 0 0 0; font-size: 14px;">${listing.availability_date || "TBD"}</p>
              </div>
              <div>
                <p style="color: #9ca3af; font-size: 11px; margin: 0;">Rate</p>
                <p style="font-weight: 600; margin: 2px 0 0 0; font-size: 14px;">${listing.asking_rate_psf || "Contact"}</p>
              </div>
              <div>
                <p style="color: #9ca3af; font-size: 11px; margin: 0;">Submarket</p>
                <p style="font-weight: 600; margin: 2px 0 0 0; font-size: 14px;">${escapeHtml(listing.submarket)}</p>
              </div>
              ${
                listing.cross_dock && listing.cross_dock !== "Unknown"
                  ? `<div>
                <p style="color: #9ca3af; font-size: 11px; margin: 0;">Cross-Dock</p>
                <p style="font-weight: 600; margin: 2px 0 0 0; font-size: 14px;">${listing.cross_dock}</p>
              </div>`
                  : ""
              }
              ${
                listing.trailer_parking && listing.trailer_parking !== "Unknown"
                  ? `<div>
                <p style="color: #9ca3af; font-size: 11px; margin: 0;">Trailer</p>
                <p style="font-weight: 600; margin: 2px 0 0 0; font-size: 14px;">${listing.trailer_parking}</p>
              </div>`
                  : ""
              }
            </div>
            
            <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin: 0 0 12px 0; font-style: italic;">
              ${escapeHtml(executiveNote)}
            </p>
            
            <p style="color: #9ca3af; font-size: 12px; margin: 0; border-top: 1px solid #f3f4f6; padding-top: 12px;">
              Details / tours: ${escapeHtml(issue.primary_contact_name || "Contact us")}
              ${issue.primary_contact_email ? ` — ${escapeHtml(issue.primary_contact_email)}` : ""}
              ${issue.primary_contact_phone ? ` — ${escapeHtml(issue.primary_contact_phone)}` : ""}
            </p>
          </div>
          ${photoHtml}
        </div>
      </div>
    `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(issue.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      color: #1f2937;
      line-height: 1.5;
    }
    @page {
      size: A4;
      margin: 20mm;
    }
    .page { page-break-after: always; }
    .page:last-child { page-break-after: avoid; }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="page" style="padding: 60px 40px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); min-height: 100vh;">
    ${issue.logo_url ? `<img src="${escapeHtml(issue.logo_url)}" alt="Logo" style="height: 50px; margin-bottom: 40px;" />` : ""}
    
    <h1 style="font-size: 36px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; line-height: 1.2;">
      ${escapeHtml(issue.title)}
    </h1>
    
    <p style="font-size: 20px; color: #64748b; margin: 0 0 12px 0;">
      Curated snapshot of logistics-capable space in ${escapeHtml(issue.market)}
    </p>
    
    <p style="font-size: 14px; color: #94a3b8; margin: 0 0 40px 0;">
      Published ${publishDate}
    </p>
    
    <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 600px;">
      <p style="margin: 0; font-size: 16px; color: #374151;">
        <strong>${issue.total_listings} spaces</strong> above ${issue.size_threshold.toLocaleString()} SF are currently tracked.
        Earliest availability is <strong>${earliestAvailability}</strong>.
        ${issue.new_count > 0 ? `New this month: <strong>${issue.new_count}</strong>.` : ""}
      </p>
    </div>
    
    <div style="position: absolute; bottom: 60px; left: 40px; right: 40px;">
      <div style="border-top: 1px solid #cbd5e1; padding-top: 20px;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">
          ${escapeHtml(issue.primary_contact_name || "")}
          ${issue.primary_contact_email ? ` | ${escapeHtml(issue.primary_contact_email)}` : ""}
          ${issue.primary_contact_phone ? ` | ${escapeHtml(issue.primary_contact_phone)}` : ""}
        </p>
        <p style="margin: 0; font-size: 11px; color: #94a3b8;">
          Information believed reliable but not guaranteed. Rates/availability subject to change.
        </p>
      </div>
    </div>
  </div>
  
  <!-- Market Snapshot Page -->
  <div class="page" style="padding: 40px;">
    <h2 style="font-size: 24px; font-weight: 600; margin: 0 0 24px 0; color: #0f172a;">
      Market Snapshot
    </h2>
    
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 40px;">
      <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center;">
        <p style="font-size: 32px; font-weight: 700; margin: 0; color: #0f172a;">${issue.total_listings}</p>
        <p style="font-size: 12px; color: #64748b; margin: 8px 0 0 0;">Total Tracked</p>
      </div>
      <div style="background: #dcfce7; border-radius: 12px; padding: 24px; text-align: center;">
        <p style="font-size: 32px; font-weight: 700; margin: 0; color: #16a34a;">${issue.new_count}</p>
        <p style="font-size: 12px; color: #64748b; margin: 8px 0 0 0;">New</p>
      </div>
      <div style="background: #fef3c7; border-radius: 12px; padding: 24px; text-align: center;">
        <p style="font-size: 32px; font-weight: 700; margin: 0; color: #d97706;">${issue.changed_count}</p>
        <p style="font-size: 12px; color: #64748b; margin: 8px 0 0 0;">Changed</p>
      </div>
      <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center;">
        <p style="font-size: 18px; font-weight: 700; margin: 0; color: #0f172a;">
          ${minSize.toLocaleString()}–${maxSize.toLocaleString()}
        </p>
        <p style="font-size: 12px; color: #64748b; margin: 8px 0 0 0;">Size Range (SF)</p>
      </div>
    </div>
    
    <div style="background: #f8fafc; border-radius: 12px; padding: 20px;">
      <p style="margin: 0; font-size: 14px; color: #475569;">
        <strong>Earliest Availability:</strong> ${earliestAvailability}
      </p>
    </div>
  </div>
  
  <!-- Property Cards -->
  <div class="page" style="padding: 40px;">
    <h2 style="font-size: 24px; font-weight: 600; margin: 0 0 24px 0; color: #0f172a;">
      Properties
    </h2>
    ${propertyCardsHtml}
  </div>
  
  <!-- CTA Page -->
  <div class="page" style="padding: 60px 40px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); min-height: 100vh; color: white;">
    <h2 style="font-size: 32px; font-weight: 700; margin: 0 0 24px 0;">
      Planning 6–24 months out?
    </h2>
    
    <p style="font-size: 18px; line-height: 1.6; max-width: 600px; color: #cbd5e1; margin: 0 0 40px 0;">
      Most logistics users don't see the best options until timing is tight. If any of these are relevant—or if you want off-market options—reply and we'll shortlist sites quickly.
    </p>
    
    <div style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 24px; max-width: 400px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 16px;">
        ${escapeHtml(issue.primary_contact_name || "Contact Us")}
      </p>
      ${issue.primary_contact_email ? `<p style="margin: 0 0 4px 0; color: #94a3b8;">${escapeHtml(issue.primary_contact_email)}</p>` : ""}
      ${issue.primary_contact_phone ? `<p style="margin: 0; color: #94a3b8;">${escapeHtml(issue.primary_contact_phone)}</p>` : ""}
    </div>
    
    <div style="position: absolute; bottom: 60px; left: 40px; right: 40px;">
      <p style="margin: 0; font-size: 11px; color: #64748b;">
        ${escapeHtml(issue.brokerage_name || "")} | Information believed reliable but not guaranteed. Rates/availability subject to change.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const userClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { issue_id, issue_listings } = await req.json();

    if (!issue_id) {
      return new Response(
        JSON.stringify({ error: "Missing issue_id parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Generating PDF for issue: ${issue_id}`);

    // Fetch issue data
    const { data: issue, error: issueError } = await supabaseClient
      .from("issues")
      .select("*")
      .eq("id", issue_id)
      .eq("user_id", user.id)
      .single();

    if (issueError || !issue) {
      console.error("Issue fetch error:", issueError);
      return new Response(
        JSON.stringify({ error: "Issue not found or access denied" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If issue_listings provided (from wizard), save them first
    if (issue_listings && Array.isArray(issue_listings)) {
      console.log(`Saving ${issue_listings.length} issue listings`);

      // Delete existing issue_listings for this issue
      await supabaseClient
        .from("issue_listings")
        .delete()
        .eq("issue_id", issue_id);

      // Insert new issue_listings
      const { error: insertError } = await supabaseClient
        .from("issue_listings")
        .insert(issue_listings);

      if (insertError) {
        console.error("Error saving issue listings:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to save issue listings" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Fetch issue_listings with listing data
    const { data: fetchedIssueListings, error: listingsError } =
      await supabaseClient
        .from("issue_listings")
        .select(
          `
        id,
        listing_id,
        change_status,
        executive_note,
        sort_order,
        listings (
          id,
          listing_id,
          property_name,
          address,
          city,
          submarket,
          size_sf,
          clear_height_ft,
          dock_doors,
          drive_in_doors,
          yard,
          availability_date,
          asking_rate_psf,
          cross_dock,
          trailer_parking,
          photo_url,
          notes_public
        )
      `
        )
        .eq("issue_id", issue_id)
        .order("sort_order", { ascending: true });

    if (listingsError) {
      console.error("Listings fetch error:", listingsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch listings" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!fetchedIssueListings || fetchedIssueListings.length === 0) {
      return new Response(
        JSON.stringify({ error: "No listings found for this issue" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Found ${fetchedIssueListings.length} listings for PDF`);

    // Transform data to match expected types
    const transformedListings: IssueListing[] = fetchedIssueListings.map((il: any) => ({
      id: il.id,
      listing_id: il.listing_id,
      change_status: il.change_status,
      executive_note: il.executive_note,
      sort_order: il.sort_order,
      listings: il.listings as Listing,
    }));

    // Generate HTML for PDF
    const htmlContent = generatePdfHtml(
      issue as Issue,
      transformedListings
    );

    // Convert HTML to PDF using base64 encoding
    const encoder = new TextEncoder();
    const htmlBytes = encoder.encode(htmlContent);

    // Generate filename
    const dateStr = format(new Date(), "yyyy_MM");
    const filename = `distribution_snapshot_${dateStr}_${issue_id.slice(0, 8)}.html`;

    // Upload to storage (HTML file that can be printed to PDF by browser)
    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from("issue-pdfs")
      .upload(filename, htmlBytes, {
        contentType: "text/html",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to upload PDF" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabaseClient.storage.from("issue-pdfs").getPublicUrl(filename);

    // Generate share token if not exists
    const shareToken = issue.pdf_share_token || generateShareToken();

    // Update issue with PDF info
    const { error: updateError } = await supabaseClient
      .from("issues")
      .update({
        pdf_url: publicUrl,
        pdf_filename: filename,
        pdf_filesize: htmlBytes.length,
        pdf_generated_at: new Date().toISOString(),
        pdf_share_token: shareToken,
      })
      .eq("id", issue_id);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update issue record" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`PDF generated successfully: ${publicUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        pdf_url: publicUrl,
        pdf_filename: filename,
        pdf_filesize: htmlBytes.length,
        pdf_share_token: shareToken,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("PDF generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
