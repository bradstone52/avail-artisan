import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type YesNoUnknown = "Yes" | "No" | "Unknown";

interface Listing {
  id?: string;
  listing_id: string;
  display_address: string | null;
  address: string;
  city: string;
  submarket: string;
  status: string;
  size_sf: number | null;
  clear_height_ft: number | null;
  dock_doors: number | null;
  drive_in_doors: number | null;
  trailer_parking: YesNoUnknown | string | null;
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

    const listingSelectFields = [
      "id",
      "listing_id",
      "display_address",
      "address",
      "city",
      "submarket",
      "status",
      "size_sf",
      "clear_height_ft",
      "dock_doors",
      "drive_in_doors",
      "trailer_parking",
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
        .order("size_sf", { ascending: false });

      if (listingsErr) throw new Error("Failed to load listings");
      safeListings = (listings || []) as unknown as Listing[];
    }

    const html = buildPdfHtml(safeIssue, safeListings, { includeDetails });
    const pdfBytes = await convertHtmlToPdf(html);

    const generatedAtIso = new Date().toISOString();
    const ymd = generatedAtIso.slice(0, 10);
    const safeName = (safeIssue.title || "distribution_snapshot")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60);

    const pdfFilename = `${safeName || "distribution_snapshot"}-${ymd}.pdf`;
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

function buildPdfHtml(issue: any, listings: any[], opts?: { includeDetails?: boolean }) {
  const includeDetails = opts?.includeDetails ?? false;

  const published = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const title = issue.title || "Large-Format Distribution Availability";
  const market = issue.market || "Calgary Region";
  const sizeThreshold = issue.size_threshold ? Number(issue.size_threshold).toLocaleString() : "100,000";

  const primary = {
    name: issue.primary_contact_name || "Brad Stone",
    email: issue.primary_contact_email || "brad@cvpartners.ca",
    phone: issue.primary_contact_phone || "(403) 613-2898",
  };

  const secondary = {
    name: issue.secondary_contact_name || "Doug Johannson",
    email: issue.secondary_contact_email || "doug@cvpartners.ca",
    phone: issue.secondary_contact_phone || "(403) 470-8875",
  };

  const total = listings.length;
  const earliest = computeEarliestAvailability(listings);
  const newCount = Number(issue.new_count || 0);

  // Sort by size descending
  const sorted = [...listings].sort((a, b) => (Number(b.size_sf || 0) - Number(a.size_sf || 0)));

  // Build chart data
  const sizeRanges = computeSizeDistribution(sorted);
  const availabilityTimeline = computeAvailabilityTimeline(sorted);

  const summaryRows = sorted.map((l, idx) => {
    const property = esc(l.display_address || l.address || "—");
    const submarket = esc(l.submarket || "");
    const size = fmtNum(l.size_sf);
    const clear = l.clear_height_ft ? `${l.clear_height_ft}'` : "—";
    const dock = l.dock_doors != null ? String(l.dock_doors) : "—";
    const drive = l.drive_in_doors != null ? String(l.drive_in_doors) : "—";
    const trailer = yesNo(l.trailer_parking);
    const avail = esc(l.availability_date || "TBD");
    const rate = esc(l.asking_rate_psf || "Market");
    const rowClass = idx % 2 === 1 ? ' class="alt"' : '';

    return `<tr${rowClass}>
      <td class="col-prop"><span class="prop-name">${property}</span><span class="prop-sub">${submarket}</span></td>
      <td class="col-num">${size}</td>
      <td class="col-num">${clear}</td>
      <td class="col-num">${dock}</td>
      <td class="col-num">${drive}</td>
      <td class="col-mid">${trailer}</td>
      <td class="col-mid">${avail}</td>
      <td class="col-mid">${rate}</td>
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
@page {
  size: A4;
  margin: 14mm 16mm;
  @bottom-right {
    content: "Page " counter(page) " of " counter(pages);
    font-size: 7pt;
    font-weight: 700;
    color: #0a0a0a;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 9pt;
  line-height: 1.4;
  color: #0a0a0a;
  background: #ffffff;
}

.page {
  page-break-after: always;
  min-height: 100%;
}
.page:last-child { page-break-after: auto; }

/* ============ TYPOGRAPHY ============ */
.text-display {
  font-size: 28pt;
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: #0a0a0a;
}

.text-headline {
  font-size: 16pt;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #0a0a0a;
}

.text-subhead {
  font-size: 12pt;
  font-weight: 500;
  color: #525252;
}

.text-micro {
  font-size: 7pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #525252;
}

/* ============ COVER PAGE ============ */
.cover {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.cover-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 40px;
}

.brand-badge {
  display: inline-block;
  background: #0a0a0a;
  color: #ffffff;
  font-size: 8pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 6px 12px;
}

.cover-date {
  font-size: 7pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #525252;
}

.cover-title {
  font-size: 28pt;
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: #0a0a0a;
  margin-bottom: 8px;
}

.cover-subtitle {
  font-size: 12pt;
  font-weight: 500;
  color: #525252;
  margin-bottom: 40px;
}

/* ============ BRUTALIST STAT BLOCKS ============ */
.stats-row {
  display: flex;
  gap: 12px;
  margin-bottom: 28px;
}

.stat-block {
  flex: 1;
  border: 2px solid #0a0a0a;
  padding: 14px 16px;
}

.stat-label {
  font-size: 7pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #525252;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24pt;
  font-weight: 900;
  color: #0a0a0a;
  line-height: 1;
}

/* ============ BRUTALIST CHARTS ============ */
.charts-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.chart-block {
  flex: 1;
  border: 2px solid #0a0a0a;
  padding: 12px 14px;
}

.chart-title {
  font-size: 7pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #525252;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #e5e5e5;
}

.chart-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chart-bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chart-bar-label {
  font-size: 7pt;
  font-weight: 600;
  color: #525252;
  width: 60px;
  flex-shrink: 0;
}

.chart-bar-track {
  flex: 1;
  height: 12px;
  background: #e5e5e5;
  border: 1px solid #0a0a0a;
}

.chart-bar-fill {
  height: 100%;
  background: #0a0a0a;
}

.chart-bar-value {
  font-size: 7pt;
  font-weight: 800;
  color: #0a0a0a;
  width: 20px;
  text-align: right;
}

/* ============ BRUTALIST SECTION ============ */
.section-block {
  border: 2px solid #0a0a0a;
  margin-bottom: 24px;
}

.section-header {
  background: #0a0a0a;
  color: #ffffff;
  padding: 8px 14px;
  font-size: 7pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.section-body {
  padding: 14px;
}

.section-body p {
  font-size: 9pt;
  color: #525252;
  line-height: 1.6;
}

/* ============ BRUTALIST TABLE ============ */
.brutalist-table-wrapper {
  border: 2px solid #0a0a0a;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 8pt;
}

thead th {
  background: #0a0a0a;
  color: #ffffff;
  text-align: left;
  padding: 10px 8px;
  font-size: 7pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: none;
}

thead th.col-num {
  text-align: right;
}

tbody td {
  padding: 10px 8px;
  border-bottom: 1px solid #e5e5e5;
  vertical-align: top;
  color: #0a0a0a;
}

tbody td.col-num {
  text-align: right;
  font-weight: 600;
}

tbody tr.alt {
  background: #fafafa;
}

tbody tr:last-child td {
  border-bottom: none;
}

.col-prop { width: 28%; }
.col-num { width: 9%; }
.col-mid { width: 10%; }

.prop-name {
  display: block;
  font-weight: 700;
  color: #0a0a0a;
  font-size: 8pt;
}

.prop-sub {
  display: block;
  font-size: 7pt;
  color: #525252;
  margin-top: 2px;
}

.table-note {
  margin-top: 16px;
  font-size: 7pt;
  color: #525252;
}

/* ============ CONTACT FOOTER ============ */
.contact-footer {
  margin-top: auto;
  border-top: 2px solid #0a0a0a;
  padding-top: 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.contact-block .contact-name {
  font-size: 9pt;
  font-weight: 700;
  color: #0a0a0a;
  margin-bottom: 2px;
}

.contact-block .contact-detail {
  font-size: 8pt;
  color: #525252;
}

/* ============ DETAIL PAGES ============ */
.detail-header {
  margin-bottom: 24px;
}

.detail-title {
  font-size: 18pt;
  font-weight: 900;
  color: #0a0a0a;
  margin-bottom: 4px;
}

.detail-location {
  font-size: 10pt;
  color: #525252;
}

.detail-id {
  font-size: 7pt;
  font-weight: 700;
  color: #737373;
  margin-top: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.specs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 24px;
}

.spec-block {
  border: 2px solid #0a0a0a;
  padding: 12px 14px;
}

.spec-label {
  font-size: 7pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #525252;
  margin-bottom: 4px;
}

.spec-value {
  font-size: 16pt;
  font-weight: 900;
  color: #0a0a0a;
  line-height: 1;
}

.notes-block {
  border: 2px solid #0a0a0a;
  margin-bottom: 24px;
}

.notes-header {
  background: #0a0a0a;
  color: #ffffff;
  padding: 8px 14px;
  font-size: 7pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.notes-body {
  padding: 14px;
  font-size: 9pt;
  color: #525252;
  line-height: 1.6;
}

.detail-contact-block {
  border: 2px solid #0a0a0a;
  padding: 14px;
}

.detail-contact-title {
  font-size: 7pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #525252;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e5e5;
}

.detail-contact-row {
  font-size: 8pt;
  color: #525252;
  margin-bottom: 4px;
}

.detail-contact-row strong {
  color: #0a0a0a;
  font-weight: 700;
}
</style>
</head>
<body>

<!-- PAGE 1: COVER -->
<div class="page cover">
  <div class="cover-header">
    <div class="brand-badge">ClearView Commercial Realty Inc.</div>
    <div class="cover-date">Published ${esc(published)}</div>
  </div>

  <h1 class="cover-title">${esc(title)}</h1>
  <p class="cover-subtitle">${esc(market)} · ${esc(sizeThreshold)}+ SF</p>

  <div class="stats-row">
    <div class="stat-block">
      <div class="stat-label">Tracked</div>
      <div class="stat-value">${total}</div>
    </div>
    <div class="stat-block">
      <div class="stat-label">Earliest</div>
      <div class="stat-value" style="font-size: 14pt;">${esc(earliest)}</div>
    </div>
    <div class="stat-block">
      <div class="stat-label">New</div>
      <div class="stat-value">${newCount}</div>
    </div>
  </div>

  ${renderChartsHtml(sizeRanges, availabilityTimeline)}

  <div class="section-block">
    <div class="section-header">How to Use This</div>
    <div class="section-body">
      <p>
        The summary table on the next page lists all tracked availabilities.
        If any space fits your criteria, reply with the property address and we'll
        confirm timing, trailer parking, and arrange a tour.
      </p>
    </div>
  </div>

  <div class="contact-footer">
    <div class="contact-block">
      <div class="contact-name">${esc(primary.name)}</div>
      <div class="contact-detail">${esc(primary.email)}</div>
      ${primary.phone ? `<div class="contact-detail">${esc(primary.phone)}</div>` : ""}
    </div>
    <div class="contact-block">
      <div class="contact-name">${esc(secondary.name)}</div>
      <div class="contact-detail">${esc(secondary.email)}</div>
      ${secondary.phone ? `<div class="contact-detail">${esc(secondary.phone)}</div>` : ""}
    </div>
  </div>
</div>

<!-- PAGE 2: SUMMARY TABLE -->
<div class="page">
  <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px;">
    <div>
      <h2 class="text-headline">Availability Summary</h2>
      <p style="font-size: 8pt; color: #525252; margin-top: 4px;">${esc(market)} · Threshold: ${esc(sizeThreshold)} SF</p>
    </div>
    <div class="text-micro">${total} Properties</div>
  </div>

  <div class="brutalist-table-wrapper">
    <table>
      <thead>
        <tr>
          <th class="col-prop">Property / Submarket</th>
          <th class="col-num">Size (SF)</th>
          <th class="col-num">Clear</th>
          <th class="col-num">Dock</th>
          <th class="col-num">Drive</th>
          <th class="col-mid">Trailer</th>
          <th class="col-mid">Avail.</th>
          <th class="col-mid">Rate</th>
        </tr>
      </thead>
      <tbody>
        ${summaryRows}
      </tbody>
    </table>
  </div>

  <p class="table-note">
    Information believed reliable but not guaranteed. Rates and availability subject to change.
  </p>
</div>

${detailPages}

</body>
</html>`;
}

function renderChartsHtml(sizeRanges: Array<{label: string; count: number; pct: number}>, timeline: Array<{label: string; count: number; pct: number}>) {
  if (sizeRanges.length === 0 && timeline.length === 0) return "";

  const sizeBarHtml = sizeRanges.map(r => `
    <div class="chart-bar-row">
      <span class="chart-bar-label">${esc(r.label)}</span>
      <div class="chart-bar-track"><div class="chart-bar-fill" style="width: ${r.pct}%;"></div></div>
      <span class="chart-bar-value">${r.count}</span>
    </div>
  `).join("");

  const timelineBarHtml = timeline.map(t => `
    <div class="chart-bar-row">
      <span class="chart-bar-label">${esc(t.label)}</span>
      <div class="chart-bar-track"><div class="chart-bar-fill" style="width: ${t.pct}%;"></div></div>
      <span class="chart-bar-value">${t.count}</span>
    </div>
  `).join("");

  return `
  <div class="charts-row">
    <div class="chart-block">
      <div class="chart-title">Size Distribution</div>
      <div class="chart-bars">${sizeBarHtml}</div>
    </div>
    <div class="chart-block">
      <div class="chart-title">Availability Timeline</div>
      <div class="chart-bars">${timelineBarHtml}</div>
    </div>
  </div>`;
}

function renderDetailPage(l: any, primary: any, secondary: any) {
  const title = esc(l.display_address || l.address || "Property");
  const loc = esc([l.city, l.submarket].filter(Boolean).join(" · "));
  const size = fmtNum(l.size_sf);
  const clear = l.clear_height_ft ? `${l.clear_height_ft}'` : "—";
  const dock = l.dock_doors != null ? String(l.dock_doors) : "—";
  const drive = l.drive_in_doors != null ? String(l.drive_in_doors) : "—";
  const trailer = yesNo(l.trailer_parking);
  const avail = esc(l.availability_date || "TBD");
  const rate = esc(l.asking_rate_psf || "Market");
  const notes = (l.notes_public || "").trim();

  return `
<div class="page">
  <div class="detail-header">
    <h2 class="detail-title">${title}</h2>
    <p class="detail-location">${loc}</p>
    ${l.listing_id ? `<p class="detail-id">ID: ${esc(l.listing_id)}</p>` : ""}
  </div>

  <div class="specs-grid">
    <div class="spec-block">
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
      <div class="spec-label">Trailer Parking</div>
      <div class="spec-value">${trailer}</div>
    </div>
    <div class="spec-block">
      <div class="spec-label">Availability</div>
      <div class="spec-value">${avail}</div>
    </div>
    <div class="spec-block">
      <div class="spec-label">Asking Rate</div>
      <div class="spec-value">${rate}</div>
    </div>
    <div class="spec-block">
      <div class="spec-label">Submarket</div>
      <div class="spec-value">${esc(l.submarket || "—")}</div>
    </div>
  </div>

  ${notes ? `
  <div class="notes-block">
    <div class="notes-header">Notes</div>
    <div class="notes-body">${esc(notes)}</div>
  </div>
  ` : ""}

  <div class="detail-contact-block">
    <div class="detail-contact-title">Tours / Details</div>
    <p class="detail-contact-row"><strong>${esc(primary.name)}</strong> — ${esc(primary.email)}${primary.phone ? ` · ${esc(primary.phone)}` : ""}</p>
    <p class="detail-contact-row"><strong>${esc(secondary.name)}</strong> — ${esc(secondary.email)}${secondary.phone ? ` · ${esc(secondary.phone)}` : ""}</p>
  </div>
</div>`;
}

// ============ CHART HELPERS ============

function computeSizeDistribution(listings: any[]): Array<{label: string; count: number; pct: number}> {
  const ranges = [
    { min: 100000, max: 199999, label: "100–200K SF" },
    { min: 200000, max: 299999, label: "200–300K SF" },
    { min: 300000, max: 499999, label: "300–500K SF" },
    { min: 500000, max: Infinity, label: "500K+ SF" },
  ];

  const counts = ranges.map(r => ({
    label: r.label,
    count: listings.filter(l => {
      const sf = Number(l.size_sf) || 0;
      return sf >= r.min && sf <= r.max;
    }).length,
  }));

  const maxCount = Math.max(...counts.map(c => c.count), 1);
  return counts.filter(c => c.count > 0).map(c => ({
    ...c,
    pct: Math.round((c.count / maxCount) * 100),
  }));
}

function computeAvailabilityTimeline(listings: any[]): Array<{label: string; count: number; pct: number}> {
  const now = new Date();
  const sixMonths = new Date(now);
  sixMonths.setMonth(sixMonths.getMonth() + 6);
  const twelveMonths = new Date(now);
  twelveMonths.setMonth(twelveMonths.getMonth() + 12);
  const twentyFourMonths = new Date(now);
  twentyFourMonths.setMonth(twentyFourMonths.getMonth() + 24);

  let immediate = 0;
  let sixToTwelve = 0;
  let twelvePlus = 0;
  let tbd = 0;

  for (const l of listings) {
    const av = (l.availability_date || "").toLowerCase().trim();
    if (!av || av === "tbd" || av === "unknown") {
      tbd++;
      continue;
    }
    if (av.includes("immediate") || av.includes("now")) {
      immediate++;
      continue;
    }
    const parsed = Date.parse(l.availability_date);
    if (!Number.isNaN(parsed)) {
      const d = new Date(parsed);
      if (d <= sixMonths) {
        immediate++;
      } else if (d <= twelveMonths) {
        sixToTwelve++;
      } else {
        twelvePlus++;
      }
    } else {
      tbd++;
    }
  }

  const results = [
    { label: "Immediate", count: immediate },
    { label: "6–12 Months", count: sixToTwelve },
    { label: "12+ Months", count: twelvePlus },
  ];

  if (tbd > 0) {
    results.push({ label: "TBD", count: tbd });
  }

  const maxCount = Math.max(...results.map(r => r.count), 1);
  return results.filter(r => r.count > 0).map(r => ({
    ...r,
    pct: Math.round((r.count / maxCount) * 100),
  }));
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

function yesNo(v: any): string {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return "—";
  if (["yes", "y", "true", "1"].includes(s)) return "Yes";
  if (["no", "n", "false", "0"].includes(s)) return "No";
  if (["unknown", "tbd"].includes(s)) return "—";
  return esc(v);
}

function computeEarliestAvailability(listings: any[]): string {
  const rank = (v: string) => {
    const s = (v || "").toLowerCase().trim();
    if (!s || s === "tbd" || s === "unknown") return 999999;
    if (s.includes("immediate") || s.includes("now")) return 0;
    const t = Date.parse(v);
    if (!Number.isNaN(t)) return t;
    const m = s.match(/q([1-4])\s*(20\d{2})/i);
    if (m) {
      const q = Number(m[1]);
      const y = Number(m[2]);
      return Date.UTC(y, (q - 1) * 3, 1);
    }
    return 900000;
  };

  let best = "TBD";
  let bestRank = 9999999;

  for (const l of listings) {
    const v = String(l.availability_date || "TBD");
    const r = rank(v);
    if (r < bestRank) {
      bestRank = r;
      best = v;
    }
  }
  return best;
}

// ============ PDF CONVERSION ============

async function convertHtmlToPdf(html: string): Promise<Uint8Array> {
  const apiKey = Deno.env.get("DOCRAPTOR_API_KEY");
  if (!apiKey) throw new Error("DOCRAPTOR_API_KEY not configured");

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
      prince_options: {
        profile: "PDF/A-1b",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DocRaptor error: ${response.status} - ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}
