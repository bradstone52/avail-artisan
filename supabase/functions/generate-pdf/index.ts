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
    const safeListings = (listings || []) as Listing[];

    const html = buildPdfHtml(safeIssue, safeListings);
    const pdfBytes = await convertHtmlToPdf(html);

    return new Response(pdfBytes, {
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

function buildPdfHtml(issue: Issue, listings: Listing[]): string {
  const publishDate = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

  const earliestAvailability =
    listings
      .map((l) => l.availability_date || "")
      .filter(Boolean)
      .sort()[0] || "TBD";

  const tableRowsHtml = listings
    .map((l) => {
      const badge = `<span class="badge badge-new">NEW</span>`; // (still OK for now)
      return `
        <tr>
          <td class="property-cell">
            <strong>${escapeHtml(l.display_address || l.address || "")}</strong> ${badge}
            <div class="submarket">${escapeHtml(l.submarket || "")}</div>
          </td>
          <td class="num">${fmtNum(l.size_sf)}</td>
          <td class="num">${l.clear_height_ft ? `${l.clear_height_ft}'` : "—"}</td>
          <td class="num">${l.dock_doors ?? "—"}</td>
          <td class="num">${l.drive_in_doors ?? "—"}</td>
          <td>${l.trailer_parking && l.trailer_parking !== "Unknown" ? escapeHtml(String(l.trailer_parking)) : "—"}</td>
          <td>${escapeHtml(l.availability_date || "TBD")}</td>
          <td>${escapeHtml(l.asking_rate_psf || "Market")}</td>
        </tr>
      `;
    })
    .join("");

  const detailPagesHtml = listings.map((l) => buildDetailPage(issue, l)).join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(issue.title)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    margin: 0;
    padding: 0;
    color: #0f172a;
    line-height: 1.45;
  }
  @page { size: A4; margin: 18mm; }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: auto; }

  /* Page numbering */
  @page {
    @bottom-right {
      content: "Page " counter(page) " of " counter(pages);
      font-size: 9pt;
      color: #64748b;
    }
  }

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

  /* Cover Page (FIXED: no absolute footer; use flex) */
  .cover-page {
    padding: 40px;
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .cover-logo { height: 48px; margin-bottom: 8px; }
  .cover-title {
    font-size: 28pt;
    font-weight: 800;
    margin: 0;
    line-height: 1.15;
  }
  .cover-subtitle {
    font-size: 14pt;
    color: #475569;
    margin: 0;
  }
  .cover-date {
    font-size: 10pt;
    color: #64748b;
    margin: 0 0 8px 0;
  }
  .cover-stats {
    background: white;
    border-radius: 10px;
    padding: 18px 18px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.10);
    max-width: 560px;
  }
  .cover-stats p { margin: 0; font-size: 11.5pt; color: #0f172a; }
  .how-to-use {
    background: rgba(255,255,255,0.7);
    border: 1px solid rgba(148,163,184,0.35);
    border-radius: 10px;
    padding: 14px 16px;
    max-width: 560px;
  }
  .how-to-use h4 {
    margin: 0 0 6px 0;
    font-size: 10pt;
    color: #334155;
    font-weight: 700;
  }
  .how-to-use p { margin: 0; font-size: 9.5pt; color: #475569; }

  .cover-footer {
    margin-top: auto;              /* <- pushes footer to bottom */
    border-top: 1px solid #cbd5e1;
    padding-top: 14px;
  }
  .cover-contacts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px 24px;
    margin-bottom: 10px;
  }
  .cover-contact strong { display:block; font-size: 10pt; margin-bottom: 2px; }
  .cover-contact span { font-size: 9pt; color: #334155; }
  .cover-disclaimer { font-size: 8pt; color: #64748b; margin: 0; }

  /* Summary */
  .summary-page { padding: 8px 0 0 0; }
  .summary-title { font-size: 16pt; font-weight: 800; margin: 0 0 14px 0; }
  .summary-note { font-size: 9.5pt; color: #475569; margin: 0 0 10px 0; }

  .summary-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
  }
  .summary-table th {
    background: #f1f5f9;
    padding: 8px 6px;
    text-align: left;
    font-weight: 700;
    color: #334155;
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
  .property-cell { min-width: 180px; }
  .property-cell strong { font-size: 9pt; }
  .submarket { font-size: 7.5pt; color: #64748b; margin-top: 2px; }

  /* Detail */
  .detail-page { padding: 18px 0 0 0; }
  .detail-title { font-size: 22pt; font-weight: 900; margin: 0; }
  .detail-loc { margin: 6px 0 0 0; color: #475569; font-size: 11pt; }
  .detail-submarket { margin: 4px 0 0 0; color: #64748b; font-size: 10pt; letter-spacing: 0.02em; text-transform: uppercase; }

  .hr { border-top: 1px solid #e2e8f0; margin: 18px 0; }

  .kv {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px 18px;
    margin-top: 10px;
  }
  .kv .item {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 10px 12px;
  }
  .kv .k { font-size: 8.5pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 4px 0; }
  .kv .v { font-size: 11pt; font-weight: 800; margin: 0; }

  .notes {
    background: #f8fafc;
    border-radius: 10px;
    padding: 12px 14px;
    border: 1px solid #e2e8f0;
    margin-top: 14px;
  }
  .notes h4 { margin: 0 0 6px 0; font-size: 9.5pt; letter-spacing:0.04em; color:#475569; text-transform: uppercase; }
  .notes p { margin: 0; font-size: 10pt; color:#334155; }

  .contact-block {
    margin-top: 18px;
    padding-top: 14px;
    border-top: 1px solid #e2e8f0;
    font-size: 9.5pt;
    color: #475569;
  }
  .contact-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px 24px;
    margin-top: 8px;
  }
  .contact-grid .name { font-weight: 800; color:#0f172a; }
</style>
</head>
<body>

<!-- Cover -->
<div class="page cover-page">
  ${issue.logo_url ? `<img src="${escapeHtml(issue.logo_url)}" class="cover-logo" />` : ""}

  <h1 class="cover-title">${escapeHtml(issue.title)}</h1>
  <p class="cover-subtitle">Distribution & logistics space in ${escapeHtml(issue.market)}</p>
  <p class="cover-date">Published ${publishDate}</p>

  <div class="cover-stats">
    <p>
      <strong>${issue.total_listings} spaces</strong> above ${issue.size_threshold.toLocaleString()} SF tracked.
      Earliest availability: <strong>${escapeHtml(earliestAvailability)}</strong>.
      ${issue.new_count > 0 ? `<strong>${issue.new_count} new</strong> this period.` : ""}
    </p>
  </div>

  <div class="how-to-use">
    <h4>How to use this snapshot</h4>
    <p>
      The next pages provide a quick-scan table and then one-page spec sheets per property.
      If timing is 6–24 months out, ask us early — we can often surface off-market options.
    </p>
  </div>

  <div class="cover-footer">
    <div class="cover-contacts">
      <div class="cover-contact">
        <strong>${escapeHtml(issue.primary_contact_name || "")}</strong>
        <span>${[issue.primary_contact_email, issue.primary_contact_phone].filter(Boolean).map(escapeHtml).join(" | ")}</span>
      </div>
      <div class="cover-contact">
        <strong>${escapeHtml(issue.secondary_contact_name || "")}</strong>
        <span>${[issue.secondary_contact_email, issue.secondary_contact_phone].filter(Boolean).map(escapeHtml).join(" | ")}</span>
      </div>
    </div>
    <p class="cover-disclaimer">
      ${escapeHtml(issue.brokerage_name || "")}${issue.brokerage_name ? " | " : ""}Information believed reliable but not guaranteed. Rates and availability subject to change.
    </p>
  </div>
</div>

<!-- Summary -->
<div class="page summary-page">
  <h2 class="summary-title">Availability Summary</h2>
  <p class="summary-note">Trailer parking shown only where confirmed. Rates/availability subject to change.</p>

  <table class="summary-table">
    <thead>
      <tr>
        <th>Property / Submarket</th>
        <th class="num">Size (SF)</th>
        <th class="num">Clear</th>
        <th class="num">Dock</th>
        <th class="num">Drive-In</th>
        <th>Trailer</th>
        <th>Availability</th>
        <th>Rate</th>
      </tr>
    </thead>
    <tbody>${tableRowsHtml}</tbody>
  </table>
</div>

<!-- Detail pages -->
${detailPagesHtml}

</body>
</html>
`;
}

function buildDetailPage(issue: Issue, l: Listing): string {
  const title = l.display_address || l.address || "";
  const trailer = l.trailer_parking && l.trailer_parking !== "Unknown" ? String(l.trailer_parking) : "—";

  return `
  <div class="page detail-page">
    <div style="display:flex;align-items:center;gap:10px;">
      <h2 class="detail-title">${escapeHtml(title)}</h2>
      <span class="badge badge-new">NEW</span>
    </div>
    <p class="detail-loc">${escapeHtml(l.city || "")}</p>
    <p class="detail-submarket">${escapeHtml(l.submarket || "")}</p>

    <div class="hr"></div>

    <div class="kv">
      <div class="item"><p class="k">Total Area</p><p class="v">${fmtNum(l.size_sf)} SF</p></div>
      <div class="item"><p class="k">Clear Height</p><p class="v">${l.clear_height_ft ? `${l.clear_height_ft}'` : "—"}</p></div>
      <div class="item"><p class="k">Dock Doors</p><p class="v">${l.dock_doors ?? "—"}</p></div>
      <div class="item"><p class="k">Drive-In Doors</p><p class="v">${l.drive_in_doors ?? "—"}</p></div>
      <div class="item"><p class="k">Trailer Parking</p><p class="v">${escapeHtml(trailer)}</p></div>
      <div class="item"><p class="k">Availability</p><p class="v">${escapeHtml(l.availability_date || "TBD")}</p></div>
      <div class="item"><p class="k">Asking Rate</p><p class="v">${escapeHtml(l.asking_rate_psf || "Market")}</p></div>
      <div class="item"><p class="k">Submarket</p><p class="v">${escapeHtml(l.submarket || "")}</p></div>
    </div>

    ${
      l.notes_public
        ? `
      <div class="notes">
        <h4>Notes</h4>
        <p>${escapeHtml(l.notes_public)}</p>
      </div>
    `
        : ""
    }

    <div class="contact-block">
      For tours / details:
      <div class="contact-grid">
        <div>
          <div class="name">${escapeHtml(issue.primary_contact_name || "")}</div>
          <div>${[issue.primary_contact_email, issue.primary_contact_phone].filter(Boolean).map(escapeHtml).join(" | ")}</div>
        </div>
        <div>
          <div class="name">${escapeHtml(issue.secondary_contact_name || "")}</div>
          <div>${[issue.secondary_contact_email, issue.secondary_contact_phone].filter(Boolean).map(escapeHtml).join(" | ")}</div>
        </div>
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
