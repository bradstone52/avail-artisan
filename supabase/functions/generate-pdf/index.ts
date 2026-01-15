import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type YesNoUnknown = "Yes" | "No" | "Unknown";

interface Listing {
  id?: string;
  listing_id: string;
  display_address: string | null;
  property_name: string | null;
  address: string;
  city: string;
  submarket: string;
  status: string;
  size_sf: number | null;
  clear_height_ft: number | null;
  dock_doors: number | null;
  drive_in_doors: number | null;
  availability_date: string | null;
  asking_rate_psf: string | null;
  notes_public: string | null;
  link: string | null;
  photo_url?: string | null;
}

interface Issue {
  id: string;
  user_id: string;
  title: string;
  market: string;
  size_threshold: number;
  total_listings: number;
  new_count: number;
  logo_url: string | null;
  brokerage_name: string | null;
  cover_image_url: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  secondary_contact_name: string | null;
  secondary_contact_email: string | null;
  secondary_contact_phone: string | null;
  pdf_share_token: string | null;
}

interface IssueListingPayload {
  issue_id: string;
  listing_id: string;
  change_status: string | null;
  executive_note: string | null;
  sort_order: number;
}

interface PdfGenerationResult {
  success: boolean;
  pdf_url: string;
  pdf_filename: string;
  pdf_filesize: number;
  pdf_share_token: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));

    const issueId: string | undefined = body.issueId || body.issue_id;
    if (!issueId) throw new Error("Missing issueId");

    const includeDetails: boolean = body.includeDetails ?? body.include_details ?? false;
    
    // Handle sizeThresholdMax with debug logging
    let sizeThresholdMax: number = body.size_threshold_max ?? body.sizeThresholdMax ?? 500000;
    if (sizeThresholdMax === undefined || sizeThresholdMax === null || isNaN(sizeThresholdMax)) {
      console.log("maxSF missing; default applied");
      sizeThresholdMax = 500000;
    }

    const issueListingsPayload: IssueListingPayload[] | undefined = body.issue_listings;

    const { data: issue, error: issueErr } = await supabase.from("issues").select("*").eq("id", issueId).single();
    if (issueErr || !issue) throw new Error("Issue not found");

    const safeIssue = issue as Issue;

    const noteByListingId = new Map<string, string>();
    const orderedListingIds: string[] | null = Array.isArray(issueListingsPayload) && issueListingsPayload.length > 0
      ? issueListingsPayload
          .slice()
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((x) => {
            if (x.listing_id && x.executive_note) noteByListingId.set(x.listing_id, x.executive_note);
            return x.listing_id;
          })
      : null;

    // Removed trailer_parking from the select fields
    const listingSelectFields = [
      "id",
      "listing_id",
      "display_address",
      "property_name",
      "address",
      "city",
      "submarket",
      "status",
      "size_sf",
      "clear_height_ft",
      "dock_doors",
      "drive_in_doors",
      "availability_date",
      "asking_rate_psf",
      "notes_public",
      "link",
      "photo_url",
    ].join(",");

    let safeListings: Listing[] = [];

    if (orderedListingIds && orderedListingIds.length > 0) {
      const { data: listings, error: listingsErr } = await supabase
        .from("listings")
        .select(listingSelectFields)
        .eq("user_id", safeIssue.user_id)
        .in("id", orderedListingIds);

      if (listingsErr) throw new Error("Failed to load listings");

      const byId = new Map<string, Listing>();
      (listings || []).forEach((l: any) => {
        if (l?.id) byId.set(String(l.id), l as Listing);
      });

      safeListings = orderedListingIds
        .map((id) => byId.get(id))
        .filter(Boolean) as Listing[];
    } else {
      const { data: listings, error: listingsErr } = await supabase
        .from("listings")
        .select(listingSelectFields)
        .eq("user_id", safeIssue.user_id)
        .eq("include_in_issue", true)
        .eq("status", "Active")
        .gte("size_sf", safeIssue.size_threshold)
        .lte("size_sf", sizeThresholdMax)
        .order("size_sf", { ascending: false });

      if (listingsErr) throw new Error("Failed to load listings");
      safeListings = (listings || []) as unknown as Listing[];
    }

    const generatedAtIso = new Date().toISOString();
    const generatedDate = new Date(generatedAtIso);
    
    const html = buildPdfHtml(safeIssue, safeListings, { includeDetails, sizeThresholdMax, generatedDate });
    const pdfBytes = await convertHtmlToPdf(html, generatedDate);

    // Format filename as Distribution_Availabilities_MonYYYY.pdf
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monYYYY = `${monthNames[generatedDate.getMonth()]}${generatedDate.getFullYear()}`;
    const pdfFilename = `Distribution_Availabilities_${monYYYY}.pdf`;
    const storagePath = `${safeIssue.user_id}/${safeIssue.id}/${pdfFilename}`;

    const uploadRes = await supabase.storage
      .from("issue-pdfs")
      .upload(storagePath, pdfBytes.buffer as ArrayBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadRes.error) throw new Error(`Failed to upload PDF: ${uploadRes.error.message}`);

    const publicUrl = supabase.storage.from("issue-pdfs").getPublicUrl(storagePath).data.publicUrl;

    const shareToken = safeIssue.pdf_share_token || crypto.randomUUID().replace(/-/g, "");

    const { error: updateErr } = await supabase
      .from("issues")
      .update({
        pdf_url: publicUrl,
        pdf_filename: pdfFilename,
        pdf_filesize: pdfBytes.byteLength,
        pdf_generated_at: generatedAtIso,
        pdf_share_token: shareToken,
      })
      .eq("id", safeIssue.id);

    if (updateErr) throw new Error(`Failed to update issue: ${updateErr.message}`);

    const result: PdfGenerationResult = {
      success: true,
      pdf_url: publicUrl,
      pdf_filename: pdfFilename,
      pdf_filesize: pdfBytes.byteLength,
      pdf_share_token: shareToken,
    };

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============ NEO-BRUTALIST PDF HTML TEMPLATE ============
// Redesigned cover with hero image, cleaner layout

function buildPdfHtml(issue: any, listings: any[], opts?: { includeDetails?: boolean; sizeThresholdMax?: number; generatedDate?: Date }) {
  const includeDetails = opts?.includeDetails ?? false;
  const sizeThresholdMax = opts?.sizeThresholdMax ?? 500000;
  const generatedDate = opts?.generatedDate ?? new Date();

  // Cover image: use uploaded image or null (no fallback)
  const coverImageUrl: string | null = issue.cover_image_url || null;
  
  // Log cover image for debugging
  console.log(`[generate-pdf] Cover image URL: ${coverImageUrl || '(none - section will be hidden)'}`);

  // Format month/year for title
  const monthYear = generatedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const title = issue.title || `Large-Format Distribution Availability — ${monthYear}`;
  const market = issue.market || "Calgary Region";
  const sizeThreshold = issue.size_threshold ? Number(issue.size_threshold).toLocaleString() : "100,000";
  const sizeThresholdMaxStr = sizeThresholdMax.toLocaleString();

  const primary = {
    name: issue.primary_contact_name || "Brad Stone",
    title: "Partner, Associate Broker",
    email: issue.primary_contact_email || "brad@cvpartners.ca",
    phone: issue.primary_contact_phone || "(403) 613-2898",
  };

  const secondary = {
    name: issue.secondary_contact_name || "Doug Johannson",
    title: "Partner, Vice President",
    email: issue.secondary_contact_email || "doug@cvpartners.ca",
    phone: issue.secondary_contact_phone || "(403) 470-8875",
  };

  const total = listings.length;

  // Sort by size descending
  const sorted = [...listings].sort((a, b) => (Number(b.size_sf || 0) - Number(a.size_sf || 0)));

  // Summary table rows - NO trailer parking column
  // Ceiling Ht, Docks, Drive-In are center-aligned
  const summaryRows = sorted.map((l, idx) => {
    const property = esc(l.property_name || l.display_address || l.address || "—");
    const submarket = esc(l.submarket || "");
    const city = esc(l.city || "—");
    const size = fmtNum(l.size_sf);
    const clear = l.clear_height_ft ? `${l.clear_height_ft}'` : "—";
    const dock = l.dock_doors != null ? String(l.dock_doors) : "—";
    // Drive-In: show "—" for 0, null, or undefined
    const driveVal = l.drive_in_doors;
    const drive = (driveVal == null || driveVal === 0) ? "—" : String(driveVal);
    const avail = esc(l.availability_date || "TBD");
    const rowClass = idx % 2 === 1 ? ' class="alt"' : '';

    return `<tr${rowClass}>
      <td class="col-prop"><span class="prop-name">${property}</span><span class="prop-sub">${submarket}</span></td>
      <td class="col-city">${city}</td>
      <td class="col-num">${size}</td>
      <td class="col-center">${clear}</td>
      <td class="col-center">${dock}</td>
      <td class="col-center">${drive}</td>
      <td class="col-mid">${avail}</td>
    </tr>`;
  }).join("");

  const detailPages = includeDetails
    ? sorted.map((l) => renderDetailPage(l, primary, secondary)).join("")
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${esc(title)}</title>
<style>
/* ============ NEO-BRUTALIST PDF STYLES ============ */

:root {
  --bg: #ffffff;
  --ink: #0b0b0f;
  --muted: #374151;
  --border: #0b0b0f;
  --blue: #2563eb;
  --yellow: #facc15;
  --paper: #f8fafc;
  --table-stripe: #f3f4f6;
}

@page {
  size: A4;
  margin: 14mm 16mm;
  @bottom-right {
    content: "Page " counter(page) " of " counter(pages);
    font-size: 7pt;
    font-weight: 700;
    color: var(--ink);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
}

@page cover {
  margin: 0;
  @bottom-right {
    content: none;
  }
}

* { box-sizing: border-box; margin: 0; padding: 0; }

/* ============ PAGE BREAK SAFETY (Prince/DocRaptor hardening) ============ */
tr, .listing-row, .property-row {
  break-inside: avoid !important;
  page-break-inside: avoid !important;
  -webkit-column-break-inside: avoid !important;
}

/* Ensure property + submarket never split */
td.col-prop {
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}

tbody {
  break-inside: auto;
  page-break-inside: auto;
}

table {
  break-inside: auto;
  page-break-inside: auto;
}

/* Prince-specific: orphans/widows for better row control */
tr {
  orphans: 2;
  widows: 2;
}

body {
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 9pt;
  line-height: 1.4;
  color: var(--ink);
  background: var(--bg);
}

.page {
  page-break-after: always;
  min-height: 100%;
}
.page:last-child { page-break-after: auto; }

.page-cover {
  page: cover;
  page-break-after: always;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ============ COVER PAGE STYLES ============ */
.cover-hero-top {
  width: 100%;
  height: 38vh;
  background-size: cover;
  background-position: center;
  border-radius: 0;
}

.cover-content {
  padding: 32px 48px 24px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.cover-content.no-image {
  padding-top: 64px;
}

.cover-brand {
  display: inline-block;
  background: var(--ink);
  color: var(--bg);
  font-size: 8pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 6px 12px;
  margin-bottom: 24px;
  align-self: flex-start;
}

.cover-title {
  font-size: 26pt;
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1.15;
  color: var(--ink);
  margin-bottom: 12px;
}

.cover-subtitle {
  font-size: 11pt;
  font-weight: 400;
  color: var(--muted);
  margin-bottom: auto;
}

/* Clean unboxed KPI for listings tracked */
.cover-count {
  display: block;
  margin-bottom: 48px;
}

.cover-count strong {
  font-size: 28pt;
  font-weight: 900;
  color: var(--ink);
  display: block;
  margin-bottom: 4px;
}

.cover-count span {
  font-size: 9pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}

.cover-contacts {
  border-top: 3px solid var(--ink);
  padding-top: 20px;
  display: flex;
  gap: 64px;
  margin-top: auto;
}

.contact-block {
  flex: 1;
  min-width: 0;
}

.contact-block .contact-name {
  font-size: 11pt;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 3px;
}

.contact-block .contact-title {
  font-size: 9pt;
  font-weight: 400;
  color: var(--muted);
  margin-bottom: 8px;
}

.contact-block .contact-detail {
  font-size: 9pt;
  color: var(--muted);
  margin-bottom: 3px;
}

/* ============ TYPOGRAPHY ============ */
.text-headline {
  font-size: 16pt;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--ink);
}

.text-micro {
  font-size: 7pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}

/* ============ BRUTALIST TABLE ============ */
.brutalist-table-wrapper {
  border: 3px solid var(--ink);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 8pt;
}

thead th {
  background: var(--ink);
  color: var(--bg);
  text-align: left;
  padding: 12px 8px;
  font-size: 7pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: none;
}

thead th.col-num {
  text-align: right;
}

/* Center-aligned columns: Ceiling Ht, Docks, Drive-In */
thead th.col-center {
  text-align: center;
}

tbody td {
  padding: 10px 8px;
  border-bottom: 1px solid #d1d5db;
  vertical-align: top;
  color: var(--ink);
}

tbody td.col-num {
  text-align: right;
  font-weight: 600;
}

tbody td.col-center {
  text-align: center;
  font-weight: 600;
}

tbody tr.alt {
  background: var(--table-stripe);
}

tbody tr:last-child td {
  border-bottom: none;
}

.col-prop { width: 28%; }
.col-city { width: 14%; }
.col-num { width: 10%; }
.col-mid { width: 12%; }

.prop-name {
  display: block;
  font-weight: 700;
  color: var(--ink);
  font-size: 8pt;
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  word-break: normal;
  overflow-wrap: anywhere;
}

/* Submarket: NO truncation, wrap to max 2 lines */
.prop-sub {
  display: block;
  font-size: 7pt;
  color: var(--muted);
  margin-top: 2px;
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  word-break: normal;
  overflow-wrap: anywhere;
  max-height: none;
  -webkit-line-clamp: unset;
}

.table-note {
  margin-top: 16px;
  font-size: 7pt;
  color: var(--muted);
}

/* ============ DETAIL PAGES ============ */
.detail-header {
  margin-bottom: 24px;
}

.detail-title {
  font-size: 18pt;
  font-weight: 900;
  color: var(--ink);
  margin-bottom: 4px;
}

.detail-location {
  font-size: 10pt;
  color: var(--muted);
}

.detail-id {
  font-size: 7pt;
  font-weight: 700;
  color: var(--blue);
  margin-top: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.specs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 24px;
}

.spec-block {
  border: 3px solid var(--ink);
  padding: 14px 16px;
  background: var(--bg);
}

.spec-block.highlight {
  border-color: var(--blue);
}

.spec-label {
  font-size: 7pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--blue);
  margin-bottom: 6px;
}

.spec-value {
  font-size: 18pt;
  font-weight: 900;
  color: var(--ink);
  line-height: 1;
}

.notes-block {
  border: 3px solid var(--ink);
  margin-bottom: 24px;
}

.notes-header {
  background: var(--yellow);
  color: var(--ink);
  padding: 10px 14px;
  font-size: 8pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border-bottom: 2px solid var(--ink);
}

.notes-body {
  padding: 14px;
  font-size: 9pt;
  color: var(--muted);
  line-height: 1.6;
}

.detail-contact-footer {
  margin-top: auto;
  border-top: 3px solid var(--ink);
  padding-top: 20px;
  display: flex;
  gap: 60px;
}
</style>
</head>
<body>

<!-- PAGE 1: COVER -->
<div class="page-cover">
  ${coverImageUrl ? `<div class="cover-hero-top" style="background-image: url('${coverImageUrl}');"></div>` : ``}
  <div class="cover-content${coverImageUrl ? `` : ` no-image`}">
    <div class="cover-brand">ClearView Commercial Realty Inc.</div>
    
    <h1 class="cover-title">Large-Format Distribution Availabilities —<br/>January 2026, Calgary &amp; Area</h1>
    <p class="cover-subtitle">Curated snapshot of logistics-capable space in Calgary and surrounding areas</p>
    
    <div class="cover-count">
      <strong>${total}</strong>
      <span>Tracked listings</span>
    </div>

    <div class="cover-contacts">
      <div class="contact-block">
        <div class="contact-name">${esc(secondary.name)}</div>
        <div class="contact-title">${esc(secondary.title)}</div>
        <div class="contact-detail">${esc(secondary.email)}</div>
        ${secondary.phone ? `<div class="contact-detail">${esc(secondary.phone)}</div>` : ""}
      </div>
      <div class="contact-block">
        <div class="contact-name">${esc(primary.name)}</div>
        <div class="contact-title">${esc(primary.title)}</div>
        <div class="contact-detail">${esc(primary.email)}</div>
        ${primary.phone ? `<div class="contact-detail">${esc(primary.phone)}</div>` : ""}
      </div>
    </div>
  </div>
</div>

<!-- PAGE 2: SUMMARY TABLE -->
<div class="page">
  <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px;">
    <div>
      <h2 class="text-headline">Availability Summary</h2>
      <p style="font-size: 8pt; color: var(--muted); margin-top: 4px;">${esc(market)} · ${esc(sizeThreshold)}–${esc(sizeThresholdMaxStr)} SF</p>
    </div>
    <div class="text-micro" style="color: var(--blue);">${total} Properties</div>
  </div>

  <div class="brutalist-table-wrapper">
    <table>
      <thead>
        <tr>
          <th class="col-prop">Property / Submarket</th>
          <th class="col-city">City</th>
          <th class="col-num">Size (SF)</th>
          <th class="col-center">Ceiling Ht</th>
          <th class="col-center">Docks</th>
          <th class="col-center">Drive-In</th>
          <th class="col-mid">Avail.</th>
        </tr>
      </thead>
      <tbody>
        ${summaryRows}
      </tbody>
    </table>
  </div>

  <p class="table-note">
    Information believed reliable but not guaranteed. Availability subject to change.
  </p>
</div>

${detailPages}

</body>
</html>`;
}

// Detail page - NO trailer parking
function renderDetailPage(l: any, primary: any, secondary: any) {
  const title = esc(l.property_name || l.display_address || l.address || "Property");
  const loc = esc([l.city, l.submarket].filter(Boolean).join(" · "));
  const size = fmtNum(l.size_sf);
  const clear = l.clear_height_ft ? `${l.clear_height_ft}'` : "—";
  const dock = l.dock_doors != null ? String(l.dock_doors) : "—";
  // Drive-In: show "—" for 0, null, or undefined
  const driveVal = l.drive_in_doors;
  const drive = (driveVal == null || driveVal === 0) ? "—" : String(driveVal);
  const avail = esc(l.availability_date || "TBD");
  const notes = (l.notes_public || "").trim();

  return `
<div class="page">
  <div class="detail-header">
    <h2 class="detail-title">${title}</h2>
    <p class="detail-location">${loc}</p>
    ${l.listing_id ? `<p class="detail-id">ID: ${esc(l.listing_id)}</p>` : ""}
  </div>

  <div class="specs-grid">
    <div class="spec-block highlight">
      <div class="spec-label">Total Area</div>
      <div class="spec-value">${size} SF</div>
    </div>
    <div class="spec-block">
      <div class="spec-label">Clear Height</div>
      <div class="spec-value">${clear}</div>
    </div>
    <div class="spec-block">
      <div class="spec-label">Dock Doors</div>
      <div class="spec-value">${dock}</div>
    </div>
    <div class="spec-block">
      <div class="spec-label">Drive-In Doors</div>
      <div class="spec-value">${drive}</div>
    </div>
    <div class="spec-block">
      <div class="spec-label">Availability</div>
      <div class="spec-value">${avail}</div>
    </div>
  </div>

  ${notes ? `
  <div class="notes-block">
    <div class="notes-header">Notes</div>
    <div class="notes-body">${esc(notes)}</div>
  </div>
  ` : ""}

  <div class="detail-contact-footer">
    <div class="contact-block">
      <div class="contact-name">${esc(secondary.name)}</div>
      <div class="contact-detail">${esc(secondary.email)}</div>
      ${secondary.phone ? `<div class="contact-detail">${esc(secondary.phone)}</div>` : ""}
    </div>
    <div class="contact-block">
      <div class="contact-name">${esc(primary.name)}</div>
      <div class="contact-detail">${esc(primary.email)}</div>
      ${primary.phone ? `<div class="contact-detail">${esc(primary.phone)}</div>` : ""}
    </div>
  </div>
</div>`;
}

// ============ HELPER FUNCTIONS ============

function fmtNum(v: any): string {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return Math.round(n).toLocaleString();
}

function esc(s: any): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ============ PDF CONVERSION ============

async function convertHtmlToPdf(html: string, generatedDate?: Date): Promise<Uint8Array> {
  const apiKey = Deno.env.get("DOCRAPTOR_API_KEY");
  if (!apiKey) throw new Error("DOCRAPTOR_API_KEY not configured");

  // Format document name as Distribution_Availabilities_MonYYYY
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const date = generatedDate ?? new Date();
  const monYYYY = `${monthNames[date.getMonth()]}${date.getFullYear()}`;
  const documentName = `Distribution_Availabilities_${monYYYY}`;

  // Debug logging
  const htmlHash = await hashString(html);
  console.log(`[generate-pdf] HTML Length: ${html.length}, Hash: ${htmlHash}`);

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

  try {
    const response = await fetch("https://docraptor.com/docs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(apiKey + ":")}`,
      },
      body: JSON.stringify({
        test: false,
        document_type: "pdf",
        document_content: html,
        name: documentName,
        prince_options: {
          profile: "PDF/A-1b",
          network_timeout: 30, // 30 seconds for external resources
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[generate-pdf] DocRaptor error: ${response.status} - ${errorText}`);
      throw new Error(`DocRaptor error: ${response.status} - ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    console.log(`[generate-pdf] PDF generated successfully, size: ${arrayBuffer.byteLength} bytes`);
    return new Uint8Array(arrayBuffer);
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const error = err as Error;
    if (error.name === 'AbortError') {
      console.error(`[generate-pdf] Request timed out after 60 seconds`);
      throw new Error('PDF generation timed out');
    }
    throw error;
  }
}

// Simple hash function for debug logging
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 4).map(b => b.toString(16).padStart(2, '0')).join('');
}
