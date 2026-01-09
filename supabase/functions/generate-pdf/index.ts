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
  secondary_contact_name: string | null;
  secondary_contact_email: string | null;
  secondary_contact_phone: string | null;
  total_listings: number;
  new_count: number;
  changed_count: number;
  removed_count: number;
  published_at: string | null;
  pdf_share_token: string | null;
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

// Fix mojibake characters (UTF-8 encoded as Latin-1)
function fixMojibake(text: string): string {
  return text
    .replace(/â€"/g, "—") // em dash
    .replace(/â€"/g, "–") // en dash
    .replace(/â€™/g, "'") // right single quote
    .replace(/â€œ/g, '"') // left double quote
    .replace(/â€\u009d/g, '"') // right double quote
    .replace(/â€¦/g, "…"); // ellipsis
}

// Helper to format contact block with primary and optional secondary
function formatContactBlock(issue: Issue, separator: string = ' • '): string {
  const primary = [
    issue.primary_contact_name,
    issue.primary_contact_email,
    issue.primary_contact_phone,
  ].filter(Boolean).join(' | ');

  const secondary = [
    issue.secondary_contact_name,
    issue.secondary_contact_email,
    issue.secondary_contact_phone,
  ].filter(Boolean).join(' | ');

  if (secondary) {
    return `${escapeHtml(primary)}${separator}${escapeHtml(secondary)}`;
  }
  return escapeHtml(primary);
}

// Parse availability date for sorting - returns a sortable value
// "Immediate" = earliest, "TBD" = latest, dates parsed normally
function parseAvailabilityForSort(availability: string | null): number {
  if (!availability) return Number.MAX_SAFE_INTEGER; // TBD equivalent
  
  const lower = availability.toLowerCase().trim();
  
  // Immediate availability = earliest possible
  if (lower === 'immediate' || lower === 'now' || lower === 'available') {
    return 0;
  }
  
  // TBD = last
  if (lower === 'tbd' || lower === 'unknown' || lower === 'n/a' || lower === '') {
    return Number.MAX_SAFE_INTEGER;
  }
  
  // Try to parse quarter format (Q1 2025, Q4 2025, etc.)
  const quarterMatch = lower.match(/q([1-4])\s*(\d{4})/);
  if (quarterMatch) {
    const quarter = parseInt(quarterMatch[1]);
    const year = parseInt(quarterMatch[2]);
    // Convert to approximate month (Q1=Jan, Q2=Apr, Q3=Jul, Q4=Oct)
    const month = (quarter - 1) * 3;
    return new Date(year, month, 1).getTime();
  }
  
  // Try to parse year only (2025, 2026)
  const yearMatch = lower.match(/^(\d{4})$/);
  if (yearMatch) {
    return new Date(parseInt(yearMatch[1]), 0, 1).getTime();
  }
  
  // Try to parse ISO date (2025-02-01)
  const isoMatch = availability.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3])).getTime();
  }
  
  // Try to parse other date formats
  const parsed = Date.parse(availability);
  if (!isNaN(parsed)) {
    return parsed;
  }
  
  // If unparseable, put it near the end but before TBD
  return Number.MAX_SAFE_INTEGER - 1;
}

// Get earliest availability from listings
function getEarliestAvailability(issueListings: IssueListing[]): string {
  const availabilities = issueListings
    .map((il) => ({
      value: il.listings.availability_date,
      sortKey: parseAvailabilityForSort(il.listings.availability_date),
    }))
    .filter((a) => a.value)
    .sort((a, b) => a.sortKey - b.sortKey);
  
  return availabilities[0]?.value || "TBD";
}

// Check if photo URL is valid
function isValidPhotoUrl(url: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  return trimmed !== "" && trimmed !== "none" && trimmed !== "n/a" && trimmed !== "null";
}

// Format a spec value, return null if not displayable
function formatSpec(value: string | number | null | undefined, suffix: string = ""): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === "" || trimmed === "unknown" || trimmed === "n/a" || trimmed === "none") return null;
    return value + suffix;
  }
  if (typeof value === "number") {
    if (value === 0) return null;
    return value.toLocaleString() + suffix;
  }
  return null;
}

function generatePdfHtml(issue: Issue, issueListings: IssueListing[]): string {
  const publishDate = issue.published_at
    ? format(new Date(issue.published_at), "MMMM d, yyyy")
    : format(new Date(), "MMMM d, yyyy");

  // Deduplicate by listing_id
  const seenListingIds = new Set<string>();
  const uniqueListings = issueListings.filter((il) => {
    if (seenListingIds.has(il.listings.listing_id)) {
      return false;
    }
    seenListingIds.add(il.listings.listing_id);
    return true;
  });

  // Calculate stats
  const sizes = uniqueListings.map((il) => il.listings.size_sf);
  const minSize = Math.min(...sizes);
  const maxSize = Math.max(...sizes);
  const earliestAvailability = getEarliestAvailability(uniqueListings);

  // Generate table rows for summary page
  const tableRowsHtml = uniqueListings
    .map((il) => {
      const l = il.listings;
      const badge = il.change_status === "new" 
        ? '<span class="badge badge-new">NEW</span>' 
        : il.change_status === "changed" 
          ? '<span class="badge badge-changed">CHG</span>' 
          : '';
      
      return `
        <tr>
          <td class="property-cell">
            <strong>${escapeHtml(l.property_name || l.address)}</strong>${badge}<br/>
            <span class="submarket">${escapeHtml(l.submarket)}</span>
          </td>
          <td class="num">${l.size_sf.toLocaleString()}</td>
          <td class="num">${l.clear_height_ft ? l.clear_height_ft + "'" : "—"}</td>
          <td class="num">${l.dock_doors || "—"}</td>
          <td class="num">${l.drive_in_doors || "—"}</td>
          <td>${l.trailer_parking && l.trailer_parking !== "Unknown" ? l.trailer_parking : "—"}</td>
          <td>${l.cross_dock && l.cross_dock !== "Unknown" ? l.cross_dock : "—"}</td>
          <td>${l.yard && l.yard !== "Unknown" ? l.yard : "—"}</td>
          <td>${l.availability_date || "TBD"}</td>
          <td>${l.asking_rate_psf || "Contact"}</td>
        </tr>
      `;
    })
    .join("");

  // Generate detail pages (1 per property)
  const detailPagesHtml = uniqueListings
    .map((il) => {
      const l = il.listings;
      const executiveNote = fixMojibake(il.executive_note || "");
      const badge = il.change_status === "new"
        ? '<span class="badge badge-new" style="margin-left: 12px;">NEW</span>'
        : il.change_status === "changed"
          ? '<span class="badge badge-changed" style="margin-left: 12px;">CHANGED</span>'
          : "";

      // Build spec groups
      const buildingSpecs = [
        formatSpec(l.size_sf, " SF") ? `<strong>${l.size_sf.toLocaleString()} SF</strong> total area` : null,
        formatSpec(l.clear_height_ft) ? `<strong>${l.clear_height_ft}'</strong> clear height` : null,
      ].filter(Boolean);

      const shippingSpecs = [
        l.dock_doors ? `<strong>${l.dock_doors}</strong> dock doors` : null,
        l.drive_in_doors ? `<strong>${l.drive_in_doors}</strong> drive-in doors` : null,
        l.cross_dock && l.cross_dock !== "Unknown" ? `Cross-dock: <strong>${l.cross_dock}</strong>` : null,
      ].filter(Boolean);

      const yardSpecs = [
        l.yard && l.yard !== "Unknown" ? `Yard: <strong>${l.yard}</strong>` : null,
        l.trailer_parking && l.trailer_parking !== "Unknown" ? `Trailer parking: <strong>${l.trailer_parking}</strong>` : null,
      ].filter(Boolean);

      const commercialSpecs = [
        l.availability_date ? `Available: <strong>${l.availability_date}</strong>` : null,
        l.asking_rate_psf ? `Asking rate: <strong>${l.asking_rate_psf}</strong>` : null,
      ].filter(Boolean);

      // Photo section (only if valid)
      const photoHtml = isValidPhotoUrl(l.photo_url)
        ? `<div class="photo-container">
             <img src="${escapeHtml(l.photo_url)}" alt="Property photo" class="property-photo" />
           </div>`
        : "";

      return `
        <div class="page detail-page">
          <div class="detail-header">
            <h2>${escapeHtml(l.property_name || l.address)}${badge}</h2>
            ${l.property_name ? `<p class="address">${escapeHtml(l.address)}, ${escapeHtml(l.city)}</p>` : `<p class="address">${escapeHtml(l.city)}</p>`}
            <p class="submarket-line">${escapeHtml(l.submarket)}</p>
          </div>

          <div class="detail-content">
            <div class="specs-column">
              ${buildingSpecs.length > 0 ? `
                <div class="spec-group">
                  <h4>Building</h4>
                  <ul>${buildingSpecs.map(s => `<li>${s}</li>`).join("")}</ul>
                </div>
              ` : ""}

              ${shippingSpecs.length > 0 ? `
                <div class="spec-group">
                  <h4>Shipping</h4>
                  <ul>${shippingSpecs.map(s => `<li>${s}</li>`).join("")}</ul>
                </div>
              ` : ""}

              ${yardSpecs.length > 0 ? `
                <div class="spec-group">
                  <h4>Yard & Parking</h4>
                  <ul>${yardSpecs.map(s => `<li>${s}</li>`).join("")}</ul>
                </div>
              ` : ""}

              ${commercialSpecs.length > 0 ? `
                <div class="spec-group">
                  <h4>Commercial</h4>
                  <ul>${commercialSpecs.map(s => `<li>${s}</li>`).join("")}</ul>
                </div>
              ` : ""}

              ${executiveNote ? `
                <div class="notes-section">
                  <h4>Notes</h4>
                  <p>${escapeHtml(executiveNote)}</p>
                </div>
              ` : ""}
            </div>

            ${photoHtml}
          </div>

          <div class="detail-footer">
            <div class="contact-block">
              <p class="contact-label">For details or tours:</p>
              <div class="contacts">
                <div class="contact">
                  <strong>${escapeHtml(issue.primary_contact_name || "Contact Us")}</strong><br/>
                  ${issue.primary_contact_email ? `${escapeHtml(issue.primary_contact_email)}<br/>` : ""}
                  ${issue.primary_contact_phone ? escapeHtml(issue.primary_contact_phone) : ""}
                </div>
                ${issue.secondary_contact_name ? `
                  <div class="contact">
                    <strong>${escapeHtml(issue.secondary_contact_name)}</strong><br/>
                    ${issue.secondary_contact_email ? `${escapeHtml(issue.secondary_contact_email)}<br/>` : ""}
                    ${issue.secondary_contact_phone ? escapeHtml(issue.secondary_contact_phone) : ""}
                  </div>
                ` : ""}
              </div>
            </div>
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
      font-size: 11pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    @page {
      size: A4;
      margin: 15mm 15mm 20mm 15mm;
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-size: 9pt;
        color: #64748b;
      }
    }
    
    @page:first {
      @bottom-right { content: none; }
    }
    
    .page {
      page-break-after: always;
      min-height: 100%;
    }
    .page:last-child { page-break-after: avoid; }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 8pt;
      font-weight: 600;
      text-transform: uppercase;
      vertical-align: middle;
    }
    .badge-new { background: #10b981; color: white; }
    .badge-changed { background: #f59e0b; color: white; }

    /* Cover Page */
    .cover-page {
      padding: 40px;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      position: relative;
      height: 100%;
    }
    .cover-logo { height: 45px; margin-bottom: 30px; }
    .cover-title {
      font-size: 28pt;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 12px 0;
      line-height: 1.2;
    }
    .cover-subtitle {
      font-size: 14pt;
      color: #64748b;
      margin: 0 0 8px 0;
    }
    .cover-date {
      font-size: 10pt;
      color: #94a3b8;
      margin: 0 0 30px 0;
    }
    .cover-stats {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      max-width: 500px;
      margin-bottom: 24px;
    }
    .cover-stats p { margin: 0; font-size: 11pt; color: #374151; }
    .how-to-use {
      background: #f1f5f9;
      border-radius: 8px;
      padding: 16px 20px;
      max-width: 500px;
    }
    .how-to-use h4 {
      margin: 0 0 8px 0;
      font-size: 10pt;
      color: #475569;
      font-weight: 600;
    }
    .how-to-use p {
      margin: 0;
      font-size: 9pt;
      color: #64748b;
      line-height: 1.5;
    }
    .cover-footer {
      position: absolute;
      bottom: 40px;
      left: 40px;
      right: 40px;
      border-top: 1px solid #cbd5e1;
      padding-top: 16px;
    }
    .cover-contacts {
      display: flex;
      gap: 40px;
      margin-bottom: 12px;
    }
    .cover-contact strong { display: block; margin-bottom: 2px; font-size: 10pt; }
    .cover-contact span { font-size: 9pt; color: #64748b; }
    .cover-disclaimer {
      font-size: 8pt;
      color: #94a3b8;
      margin: 0;
    }

    /* Summary Table Page */
    .summary-page { padding: 20px 0; }
    .summary-title {
      font-size: 16pt;
      font-weight: 600;
      margin: 0 0 16px 0;
      color: #0f172a;
    }
    .summary-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
    }
    .summary-table th {
      background: #f1f5f9;
      padding: 8px 6px;
      text-align: left;
      font-weight: 600;
      color: #475569;
      border-bottom: 2px solid #e2e8f0;
      white-space: nowrap;
    }
    .summary-table td {
      padding: 8px 6px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }
    .summary-table tr:nth-child(even) { background: #f9fafb; }
    .summary-table .num { text-align: right; }
    .summary-table .property-cell { min-width: 140px; }
    .summary-table .property-cell strong { font-size: 8.5pt; }
    .summary-table .property-cell .badge { margin-left: 4px; font-size: 6pt; padding: 1px 4px; }
    .summary-table .submarket { font-size: 7pt; color: #64748b; }

    /* Detail Pages */
    .detail-page { padding: 30px 0; }
    .detail-header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .detail-header h2 {
      font-size: 20pt;
      font-weight: 700;
      margin: 0 0 4px 0;
      color: #0f172a;
    }
    .detail-header .address {
      font-size: 11pt;
      color: #4b5563;
      margin: 0 0 2px 0;
    }
    .detail-header .submarket-line {
      font-size: 10pt;
      color: #64748b;
      margin: 0;
    }
    .detail-content {
      display: flex;
      gap: 30px;
    }
    .specs-column { flex: 1; }
    .spec-group {
      margin-bottom: 20px;
    }
    .spec-group h4 {
      font-size: 9pt;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 8px 0;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 4px;
    }
    .spec-group ul {
      margin: 0;
      padding: 0 0 0 20px;
    }
    .spec-group li {
      margin-bottom: 4px;
      font-size: 10pt;
      color: #374151;
    }
    .notes-section {
      margin-top: 24px;
      padding: 16px;
      background: #f8fafc;
      border-radius: 6px;
    }
    .notes-section h4 {
      font-size: 9pt;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 8px 0;
    }
    .notes-section p {
      margin: 0;
      font-size: 10pt;
      color: #374151;
      line-height: 1.6;
    }
    .photo-container {
      width: 200px;
      flex-shrink: 0;
    }
    .property-photo {
      width: 100%;
      height: auto;
      border-radius: 6px;
      object-fit: cover;
    }
    .detail-footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .contact-block .contact-label {
      font-size: 9pt;
      color: #64748b;
      margin: 0 0 8px 0;
    }
    .contacts {
      display: flex;
      gap: 40px;
    }
    .contact {
      font-size: 9pt;
      color: #374151;
      line-height: 1.4;
    }
    .contact strong { font-size: 10pt; }
  </style>
</head>
<body>
  <!-- Page 1: Cover -->
  <div class="page cover-page">
    ${issue.logo_url ? `<img src="${escapeHtml(issue.logo_url)}" alt="Logo" class="cover-logo" />` : ""}
    
    <h1 class="cover-title">${escapeHtml(issue.title)}</h1>
    <p class="cover-subtitle">Distribution & logistics space in ${escapeHtml(issue.market)}</p>
    <p class="cover-date">Published ${publishDate}</p>
    
    <div class="cover-stats">
      <p>
        <strong>${issue.total_listings} spaces</strong> above ${issue.size_threshold.toLocaleString()} SF tracked.
        Earliest availability: <strong>${earliestAvailability}</strong>.
        ${issue.new_count > 0 ? `<strong>${issue.new_count} new</strong> this period.` : ""}
      </p>
    </div>

    <div class="how-to-use">
      <h4>How to use this snapshot</h4>
      <p>
        Page 2 is a quick-scan table of all properties. Following pages provide detailed specs for each listing.
        Properties marked <span class="badge badge-new" style="font-size: 7pt;">NEW</span> were added recently.
        Contact us for tours, additional details, or off-market options.
      </p>
    </div>

    <div class="cover-footer">
      <div class="cover-contacts">
        <div class="cover-contact">
          <strong>${escapeHtml(issue.primary_contact_name || "")}</strong>
          <span>${[issue.primary_contact_email, issue.primary_contact_phone].filter(Boolean).map(escapeHtml).join(" | ")}</span>
        </div>
        ${issue.secondary_contact_name ? `
          <div class="cover-contact">
            <strong>${escapeHtml(issue.secondary_contact_name)}</strong>
            <span>${[issue.secondary_contact_email, issue.secondary_contact_phone].filter(Boolean).map(escapeHtml).join(" | ")}</span>
          </div>
        ` : ""}
      </div>
      <p class="cover-disclaimer">
        ${escapeHtml(issue.brokerage_name || "")}${issue.brokerage_name ? " | " : ""}Information believed reliable but not guaranteed. Rates and availability subject to change.
      </p>
    </div>
  </div>

  <!-- Page 2: Summary Table -->
  <div class="page summary-page">
    <h2 class="summary-title">Availability Summary</h2>
    <table class="summary-table">
      <thead>
        <tr>
          <th>Property / Submarket</th>
          <th class="num">Size (SF)</th>
          <th class="num">Clear</th>
          <th class="num">Dock</th>
          <th class="num">Drive-In</th>
          <th>Trailer</th>
          <th>Cross-Dock</th>
          <th>Yard</th>
          <th>Availability</th>
          <th>Rate</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>
  </div>

  <!-- Detail Pages (1 per property) -->
  ${detailPagesHtml}
</body>
</html>
  `;
}

async function convertHtmlToPdf(html: string): Promise<Uint8Array> {
  const docraptorApiKey = Deno.env.get("DOCRAPTOR_API_KEY");
  
  if (!docraptorApiKey) {
    throw new Error("DOCRAPTOR_API_KEY is not configured");
  }

  console.log("Calling DocRaptor API to convert HTML to PDF...");

  const response = await fetch("https://api.docraptor.com/docs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${btoa(docraptorApiKey + ":")}`,
    },
    body: JSON.stringify({
      test: false, // Set to true for testing (watermarked PDFs)
      document_type: "pdf",
      document_content: html,
      name: "distribution_snapshot.pdf",
      prince_options: {
        media: "print",
        baseurl: "https://vouzfwrumlhmtmgglsti.supabase.co",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("DocRaptor API error:", response.status, errorText);
    throw new Error(`DocRaptor API error: ${response.status} - ${errorText}`);
  }

  const pdfBuffer = await response.arrayBuffer();
  console.log(`PDF generated successfully, size: ${pdfBuffer.byteLength} bytes`);
  
  return new Uint8Array(pdfBuffer);
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

      // Deduplicate by listing_id before inserting
      const seenIds = new Set<string>();
      const uniqueListings = issue_listings.filter((il: { listing_id: string }) => {
        if (seenIds.has(il.listing_id)) {
          return false;
        }
        seenIds.add(il.listing_id);
        return true;
      });

      // Insert new issue_listings
      const { error: insertError } = await supabaseClient
        .from("issue_listings")
        .insert(uniqueListings);

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

    // If no issue_listings found, fall back to fetching listings directly based on issue criteria
    if (!fetchedIssueListings || fetchedIssueListings.length === 0) {
      console.log("No issue_listings found, falling back to listings table");
      
      // Fetch listings that meet the issue criteria
      const { data: fallbackListings, error: fallbackError } = await supabaseClient
        .from("listings")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "Active")
        .eq("include_in_issue", true)
        .gte("size_sf", (issue as Issue).size_threshold)
        .order("size_sf", { ascending: false });

      if (fallbackError || !fallbackListings || fallbackListings.length === 0) {
        return new Response(
          JSON.stringify({ error: "No listings found for this issue" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`Found ${fallbackListings.length} listings via fallback`);

      // Create issue_listings from fallback data
      const fallbackIssueListings = fallbackListings.map((listing: Listing, index: number) => ({
        issue_id: issue_id,
        listing_id: listing.id,
        change_status: "new",
        executive_note: null,
        sort_order: index,
      }));

      // Save them to issue_listings for future use
      await supabaseClient.from("issue_listings").insert(fallbackIssueListings);

      // Transform to expected format
      const transformedFallback: IssueListing[] = fallbackListings.map((listing: Listing, index: number) => ({
        id: `fallback-${index}`,
        listing_id: listing.id,
        change_status: "new" as string | null,
        executive_note: null,
        sort_order: index,
        listings: listing,
      }));

      // Generate HTML for PDF
      const htmlContent = generatePdfHtml(issue as Issue, transformedFallback);

      // Convert HTML to real PDF using DocRaptor
      const pdfBytes = await convertHtmlToPdf(htmlContent);

      // Generate filename
      const dateStr = format(new Date(), "yyyy_MM");
      const filename = `distribution_snapshot_${dateStr}_${issue_id.slice(0, 8)}.pdf`;

      // Upload PDF to storage
      const { error: uploadError } = await supabaseClient.storage
        .from("issue-pdfs")
        .upload(filename, pdfBytes, {
          contentType: "application/pdf",
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
      const shareToken = (issue as Issue).pdf_share_token || generateShareToken();

      // Update issue with PDF info
      const { error: updateError } = await supabaseClient
        .from("issues")
        .update({
          pdf_url: publicUrl,
          pdf_filename: filename,
          pdf_filesize: pdfBytes.length,
          pdf_generated_at: new Date().toISOString(),
          pdf_share_token: shareToken,
          total_listings: transformedFallback.length,
          new_count: transformedFallback.filter((l) => l.change_status === "new").length,
          changed_count: transformedFallback.filter((l) => l.change_status === "changed").length,
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
          pdf_filesize: pdfBytes.length,
          pdf_share_token: shareToken,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Found ${fetchedIssueListings.length} listings for PDF`);

    // Transform data to match expected types
    const transformedListings: IssueListing[] = fetchedIssueListings.map((il: Record<string, unknown>) => ({
      id: il.id as string,
      listing_id: il.listing_id as string,
      change_status: il.change_status as string | null,
      executive_note: il.executive_note as string | null,
      sort_order: il.sort_order as number,
      listings: il.listings as Listing,
    }));

    // Generate HTML for PDF
    const htmlContent = generatePdfHtml(
      issue as Issue,
      transformedListings
    );

    // Convert HTML to real PDF using DocRaptor
    const pdfBytes = await convertHtmlToPdf(htmlContent);

    // Generate filename
    const dateStr = format(new Date(), "yyyy_MM");
    const filename = `distribution_snapshot_${dateStr}_${issue_id.slice(0, 8)}.pdf`;

    // Upload PDF to storage
    const { error: uploadError } = await supabaseClient
      .storage
      .from("issue-pdfs")
      .upload(filename, pdfBytes, {
        contentType: "application/pdf",
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
    const shareToken = (issue as Issue).pdf_share_token || generateShareToken();

    // Update issue with PDF info
    const { error: updateError } = await supabaseClient
      .from("issues")
      .update({
        pdf_url: publicUrl,
        pdf_filename: filename,
        pdf_filesize: pdfBytes.length,
        pdf_generated_at: new Date().toISOString(),
        pdf_share_token: shareToken,
        total_listings: transformedListings.length,
        new_count: transformedListings.filter(l => l.change_status === "new").length,
        changed_count: transformedListings.filter(l => l.change_status === "changed").length,
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
        pdf_filesize: pdfBytes.length,
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
});
