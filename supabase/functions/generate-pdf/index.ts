import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type YesNoUnknown = "Yes" | "No" | "Unknown";

interface Listing {
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

    const { issueId } = await req.json();
    if (!issueId) throw new Error("Missing issueId");

    const { data: issue, error: issueErr } = await supabase.from("issues").select("*").eq("id", issueId).single();

    if (issueErr || !issue) throw new Error("Issue not found");

    const { data: listings, error: listingsErr } = await supabase
      .from("listings")
      .select(
        [
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
        ].join(","),
      )
      .eq("user_id", (issue as Issue).user_id)
      .eq("include_in_issue", true)
      .eq("status", "Active")
      .order("size_sf", { ascending: false });

    if (listingsErr) throw new Error("Failed to load listings");
    const safeIssue = issue as Issue;
    const safeListings = (listings || []) as unknown as Listing[];

    const html = buildPdfHtml(safeIssue, safeListings);
    const pdfBytes = await convertHtmlToPdf(html);

    return new Response(pdfBytes.buffer as ArrayBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="distribution_snapshot.pdf"`,
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

// Parse availability for sorting: "Immediate" first, "TBD" last
function parseAvailabilityForSort(val: string | null): number {
  if (!val) return 999999999;
  const lower = val.toLowerCase().trim();
  if (lower === "immediate" || lower === "now") return 0;
  if (lower === "tbd" || lower === "unknown" || lower === "n/a") return 999999998;
  
  // Try ISO date (e.g., "2026-02-01")
  const isoMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return parseInt(isoMatch[1] + isoMatch[2] + isoMatch[3], 10);
  }
  
  // Try quarter format (e.g., "Q4 2025", "Q1 2026")
  const qMatch = val.match(/Q(\d)\s*(\d{4})/i);
  if (qMatch) {
    const q = parseInt(qMatch[1], 10);
    const year = parseInt(qMatch[2], 10);
    const month = (q - 1) * 3 + 2; // Q1=02, Q2=05, Q3=08, Q4=11
    return year * 10000 + month * 100 + 15;
  }
  
  // Try month-year (e.g., "Feb 2026", "March 2025")
  const monthMatch = val.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s*(\d{4})/i);
  if (monthMatch) {
    const months: Record<string, number> = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
    };
    const m = months[monthMatch[1].toLowerCase().slice(0, 3)] || 1;
    const y = parseInt(monthMatch[2], 10);
    return y * 10000 + m * 100 + 15;
  }
  
  // Fallback: middle priority
  return 500000000;
}

function getEarliestAvailability(listings: Listing[]): string {
  const sorted = [...listings]
    .map(l => ({ val: l.availability_date || "", sort: parseAvailabilityForSort(l.availability_date) }))
    .filter(x => x.val)
    .sort((a, b) => a.sort - b.sort);
  return sorted[0]?.val || "TBD";
}

function buildPdfHtml(issue: Issue, listings: Listing[]): string {
  const publishDate = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
  const earliestAvailability = getEarliestAvailability(listings);

  // Build contacts
  const hasPrimary = !!issue.primary_contact_name;
  const hasSecondary = !!issue.secondary_contact_name;

  const primaryContactHtml = hasPrimary ? `
    <div class="contact-card">
      <div class="contact-name">${escapeHtml(issue.primary_contact_name || "")}</div>
      <div class="contact-detail">${escapeHtml(issue.primary_contact_email || "")}</div>
      <div class="contact-detail">${escapeHtml(issue.primary_contact_phone || "")}</div>
    </div>
  ` : "";

  const secondaryContactHtml = hasSecondary ? `
    <div class="contact-card">
      <div class="contact-name">${escapeHtml(issue.secondary_contact_name || "")}</div>
      <div class="contact-detail">${escapeHtml(issue.secondary_contact_email || "")}</div>
      <div class="contact-detail">${escapeHtml(issue.secondary_contact_phone || "")}</div>
    </div>
  ` : "";

  const tableRowsHtml = listings
    .map((l, idx) => {
      const isEven = idx % 2 === 1;
      const trailer = l.trailer_parking && l.trailer_parking !== "Unknown" ? escapeHtml(String(l.trailer_parking)) : "—";
      return `
        <tr class="${isEven ? 'even-row' : ''}">
          <td class="property-cell">
            <div class="prop-name">${escapeHtml(l.display_address || l.address || "")}</div>
            <div class="prop-submarket">${escapeHtml(l.submarket || "")}</div>
          </td>
          <td class="num">${fmtNum(l.size_sf)}</td>
          <td class="num">${l.clear_height_ft ? `${l.clear_height_ft}'` : "—"}</td>
          <td class="num">${l.dock_doors ?? "—"}</td>
          <td class="num">${l.drive_in_doors ?? "—"}</td>
          <td class="center">${trailer}</td>
          <td>${escapeHtml(l.availability_date || "TBD")}</td>
          <td>${escapeHtml(l.asking_rate_psf || "Market")}</td>
        </tr>
      `;
    })
    .join("");

  const detailPagesHtml = listings.map((l) => buildDetailPage(issue, l, hasPrimary, hasSecondary)).join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(issue.title)}</title>
<style>
  @page {
    size: A4;
    margin: 20mm 18mm 22mm 18mm;
    @bottom-right {
      content: "Page " counter(page) " of " counter(pages);
      font-size: 8pt;
      color: #64748b;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    }
  }
  @page :first {
    @bottom-right { content: none; }
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    color: #1e293b;
    line-height: 1.5;
    font-size: 10pt;
  }

  .page {
    page-break-after: always;
    min-height: 100%;
  }
  .page:last-child { page-break-after: auto; }

  /* ========== COVER PAGE ========== */
  .cover-page {
    display: flex;
    flex-direction: column;
    min-height: 100%;
    padding: 0;
  }

  .cover-header {
    margin-bottom: 24px;
  }
  .cover-logo {
    height: 44px;
    margin-bottom: 20px;
  }
  .cover-title {
    font-size: 32pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.1;
    margin-bottom: 8px;
    letter-spacing: -0.02em;
  }
  .cover-subtitle {
    font-size: 14pt;
    color: #475569;
    font-weight: 400;
  }
  .cover-date {
    font-size: 10pt;
    color: #64748b;
    margin-top: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .cover-stats-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 20px 24px;
    margin: 20px 0;
  }
  .stats-row {
    display: flex;
    gap: 32px;
    flex-wrap: wrap;
  }
  .stat-item {
    text-align: left;
  }
  .stat-value {
    font-size: 28pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1;
  }
  .stat-label {
    font-size: 9pt;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 4px;
  }

  .cover-howto {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-left: 4px solid #3b82f6;
    border-radius: 8px;
    padding: 16px 20px;
    margin: 16px 0;
  }
  .cover-howto h4 {
    font-size: 10pt;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .cover-howto p {
    font-size: 10pt;
    color: #475569;
    line-height: 1.5;
  }

  .cover-footer {
    margin-top: auto;
    border-top: 2px solid #e2e8f0;
    padding-top: 20px;
  }
  .contacts-grid {
    display: flex;
    gap: 32px;
    margin-bottom: 16px;
  }
  .contact-card {
    flex: 1;
  }
  .contact-name {
    font-size: 11pt;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 2px;
  }
  .contact-detail {
    font-size: 9pt;
    color: #475569;
  }
  .cover-disclaimer {
    font-size: 8pt;
    color: #94a3b8;
    border-top: 1px solid #f1f5f9;
    padding-top: 12px;
  }

  /* ========== SUMMARY TABLE ========== */
  .summary-page {
    padding-top: 0;
  }
  .summary-header {
    margin-bottom: 16px;
  }
  .summary-title {
    font-size: 20pt;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 4px;
  }
  .summary-subtitle {
    font-size: 9pt;
    color: #64748b;
  }

  .summary-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
  }
  .summary-table thead {
    background: #1e293b;
    color: white;
  }
  .summary-table th {
    padding: 10px 8px;
    text-align: left;
    font-weight: 600;
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border: none;
  }
  .summary-table th.num,
  .summary-table th.center {
    text-align: center;
  }
  .summary-table td {
    padding: 10px 8px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: top;
  }
  .summary-table tr.even-row {
    background: #f8fafc;
  }
  .summary-table .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .summary-table .center {
    text-align: center;
  }
  .property-cell {
    min-width: 160px;
  }
  .prop-name {
    font-weight: 600;
    color: #0f172a;
    font-size: 9pt;
  }
  .prop-submarket {
    font-size: 7.5pt;
    color: #64748b;
    margin-top: 1px;
  }

  /* ========== DETAIL PAGES ========== */
  .detail-page {
    padding-top: 0;
  }

  .detail-header {
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 16px;
    margin-bottom: 20px;
  }
  .detail-title {
    font-size: 24pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.15;
    margin-bottom: 4px;
  }
  .detail-location {
    font-size: 12pt;
    color: #475569;
  }
  .detail-submarket {
    font-size: 10pt;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 4px;
  }

  .specs-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }
  .spec-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px 16px;
    text-align: center;
  }
  .spec-value {
    font-size: 18pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1;
    margin-bottom: 4px;
  }
  .spec-label {
    font-size: 8pt;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .notes-box {
    background: #fffbeb;
    border: 1px solid #fcd34d;
    border-radius: 10px;
    padding: 16px 20px;
    margin-bottom: 20px;
  }
  .notes-box h4 {
    font-size: 9pt;
    font-weight: 700;
    color: #92400e;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 8px;
  }
  .notes-box p {
    font-size: 10pt;
    color: #78350f;
    line-height: 1.5;
  }

  .detail-footer {
    border-top: 2px solid #e2e8f0;
    padding-top: 16px;
    margin-top: auto;
  }
  .detail-footer-title {
    font-size: 9pt;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 10px;
  }
  .detail-contacts {
    display: flex;
    gap: 32px;
  }
</style>
</head>
<body>

<!-- ========== COVER PAGE ========== -->
<div class="page cover-page">
  <div class="cover-header">
    ${issue.logo_url ? `<img src="${escapeHtml(issue.logo_url)}" class="cover-logo" />` : ""}
    <h1 class="cover-title">${escapeHtml(issue.title)}</h1>
    <p class="cover-subtitle">Large-format distribution & logistics space in ${escapeHtml(issue.market)}</p>
    <p class="cover-date">Published ${publishDate}</p>
  </div>

  <div class="cover-stats-card">
    <div class="stats-row">
      <div class="stat-item">
        <div class="stat-value">${issue.total_listings}</div>
        <div class="stat-label">Properties</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${fmtNum(issue.size_threshold)}+</div>
        <div class="stat-label">SF Minimum</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${escapeHtml(earliestAvailability)}</div>
        <div class="stat-label">Earliest Available</div>
      </div>
      ${issue.new_count > 0 ? `
      <div class="stat-item">
        <div class="stat-value">${issue.new_count}</div>
        <div class="stat-label">New This Period</div>
      </div>
      ` : ""}
    </div>
  </div>

  <div class="cover-howto">
    <h4>How to Use This Snapshot</h4>
    <p>
      Page 2 provides a quick-scan availability summary. Following pages contain one-page spec sheets per property.
      If your timeline is 6–24 months out, contact us early — we can often surface off-market opportunities before they hit the market.
    </p>
  </div>

  <div class="cover-footer">
    <div class="contacts-grid">
      ${primaryContactHtml}
      ${secondaryContactHtml}
    </div>
    <p class="cover-disclaimer">
      ${escapeHtml(issue.brokerage_name || "")}${issue.brokerage_name ? " • " : ""}Information believed reliable but not guaranteed. All rates and availability subject to change without notice.
    </p>
  </div>
</div>

<!-- ========== SUMMARY PAGE ========== -->
<div class="page summary-page">
  <div class="summary-header">
    <h2 class="summary-title">Availability Summary</h2>
    <p class="summary-subtitle">Properties above ${fmtNum(issue.size_threshold)} SF • Sorted by size • Rates and availability subject to change</p>
  </div>

  <table class="summary-table">
    <thead>
      <tr>
        <th>Property / Submarket</th>
        <th class="num">Size (SF)</th>
        <th class="num">Clear</th>
        <th class="num">Dock</th>
        <th class="num">Drive-In</th>
        <th class="center">Trailer</th>
        <th>Availability</th>
        <th>Rate</th>
      </tr>
    </thead>
    <tbody>${tableRowsHtml}</tbody>
  </table>
</div>

<!-- ========== DETAIL PAGES ========== -->
${detailPagesHtml}

</body>
</html>
`;
}

function buildDetailPage(issue: Issue, l: Listing, hasPrimary: boolean, hasSecondary: boolean): string {
  const title = l.display_address || l.address || "";
  const trailer = l.trailer_parking && l.trailer_parking !== "Unknown" ? String(l.trailer_parking) : "—";

  const primaryHtml = hasPrimary ? `
    <div class="contact-card">
      <div class="contact-name">${escapeHtml(issue.primary_contact_name || "")}</div>
      <div class="contact-detail">${escapeHtml(issue.primary_contact_email || "")}</div>
      <div class="contact-detail">${escapeHtml(issue.primary_contact_phone || "")}</div>
    </div>
  ` : "";

  const secondaryHtml = hasSecondary ? `
    <div class="contact-card">
      <div class="contact-name">${escapeHtml(issue.secondary_contact_name || "")}</div>
      <div class="contact-detail">${escapeHtml(issue.secondary_contact_email || "")}</div>
      <div class="contact-detail">${escapeHtml(issue.secondary_contact_phone || "")}</div>
    </div>
  ` : "";

  return `
  <div class="page detail-page">
    <div class="detail-header">
      <h2 class="detail-title">${escapeHtml(title)}</h2>
      <p class="detail-location">${escapeHtml(l.city || "")}</p>
      <p class="detail-submarket">${escapeHtml(l.submarket || "")}</p>
    </div>

    <div class="specs-grid">
      <div class="spec-card">
        <div class="spec-value">${fmtNum(l.size_sf)}</div>
        <div class="spec-label">Total SF</div>
      </div>
      <div class="spec-card">
        <div class="spec-value">${l.clear_height_ft ? `${l.clear_height_ft}'` : "—"}</div>
        <div class="spec-label">Clear Height</div>
      </div>
      <div class="spec-card">
        <div class="spec-value">${l.dock_doors ?? "—"}</div>
        <div class="spec-label">Dock Doors</div>
      </div>
      <div class="spec-card">
        <div class="spec-value">${l.drive_in_doors ?? "—"}</div>
        <div class="spec-label">Drive-In Doors</div>
      </div>
      <div class="spec-card">
        <div class="spec-value">${escapeHtml(trailer)}</div>
        <div class="spec-label">Trailer Parking</div>
      </div>
      <div class="spec-card">
        <div class="spec-value">${escapeHtml(l.availability_date || "TBD")}</div>
        <div class="spec-label">Availability</div>
      </div>
      <div class="spec-card">
        <div class="spec-value">${escapeHtml(l.asking_rate_psf || "Market")}</div>
        <div class="spec-label">Asking Rate</div>
      </div>
      <div class="spec-card">
        <div class="spec-value">${escapeHtml(l.submarket || "—")}</div>
        <div class="spec-label">Submarket</div>
      </div>
    </div>

    ${l.notes_public ? `
      <div class="notes-box">
        <h4>Notes</h4>
        <p>${escapeHtml(l.notes_public)}</p>
      </div>
    ` : ""}

    <div class="detail-footer">
      <p class="detail-footer-title">For Tours & Details</p>
      <div class="detail-contacts">
        ${primaryHtml}
        ${secondaryHtml}
      </div>
    </div>
  </div>
  `;
}

async function convertHtmlToPdf(html: string): Promise<Uint8Array> {
  const docraptorApiKey = Deno.env.get("DOCRAPTOR_API_KEY");
  if (!docraptorApiKey) throw new Error("DOCRAPTOR_API_KEY is not configured");

  const response = await fetch("https://api.docraptor.com/docs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(docraptorApiKey + ":")}`,
    },
    body: JSON.stringify({
      test: false,
      document_type: "pdf",
      document_content: html,
      name: "distribution_snapshot.pdf",
      prince_options: { media: "print" },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DocRaptor error: ${text}`);
  }

  const buf = new Uint8Array(await response.arrayBuffer());
  return buf;
}

function fmtNum(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return Math.round(v).toLocaleString();
}

function escapeHtml(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
