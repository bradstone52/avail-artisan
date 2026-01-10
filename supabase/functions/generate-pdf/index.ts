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

    // Support both issueId (camelCase) and issue_id (snake_case)
    const issueId: string | undefined = body.issueId || body.issue_id;
    if (!issueId) throw new Error("Missing issueId");

    // New option: includeDetails defaults to false (2-page PDF)
    const includeDetails: boolean = body.includeDetails ?? body.include_details ?? false;

    const issueListingsPayload: IssueListingPayload[] | undefined = body.issue_listings;

    const { data: issue, error: issueErr } = await supabase.from("issues").select("*").eq("id", issueId).single();
    if (issueErr || !issue) throw new Error("Issue not found");

    const safeIssue = issue as Issue;

    // If the client passed issue_listings, use that ordering + executive notes
    // Otherwise, fall back to the user's include_in_issue list (legacy behavior).
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

    // Store PDF
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

// ============ PDF HTML TEMPLATE ============

function buildPdfHtml(issue: any, listings: any[], opts?: { includeDetails?: boolean }) {
  const includeDetails = opts?.includeDetails ?? false;

  const published = new Date().toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const title = issue.title || `Distribution Availability Snapshot`;
  const market = issue.market || "Calgary Region";
  const sizeThreshold = issue.size_threshold ? Number(issue.size_threshold).toLocaleString() : "—";

  const primary = {
    name: issue.primary_contact_name || "Brad Stone",
    email: issue.primary_contact_email || "brad@cvpartners.ca",
    phone: issue.primary_contact_phone || "(403) 613-2898",
  };

  const secondary = {
    name: issue.secondary_contact_name || "Doug Johannson",
    email: issue.secondary_contact_email || "doug@cvpartners.ca",
    phone: issue.secondary_contact_phone || "",
  };

  // Stats (simple + credible)
  const total = listings.length;
  const earliest = computeEarliestAvailability(listings);
  const newCount = Number(issue.new_count || 0);

  // Keep the summary table scannable: sort biggest first
  const sorted = [...listings].sort((a, b) => (Number(b.size_sf || 0) - Number(a.size_sf || 0)));

  const summaryRows = sorted.map((l) => {
    const property = escapeHtml(l.display_address || l.address || "");
    const submarket = escapeHtml(l.submarket || "");
    const size = fmtNum(l.size_sf);
    const clear = l.clear_height_ft ? `${l.clear_height_ft}'` : "—";
    const dock = l.dock_doors ?? "—";
    const drive = l.drive_in_doors ?? "—";
    const trailer = normalizeYesNoUnknown(l.trailer_parking);
    const avail = escapeHtml(l.availability_date || "TBD");
    const rate = escapeHtml(l.asking_rate_psf || "Market");

    return `
      <tr>
        <td class="col-prop">
          <div class="prop-name">${property}</div>
          <div class="prop-sub">${submarket}</div>
        </td>
        <td class="col-num">${size}</td>
        <td class="col-num">${clear}</td>
        <td class="col-num">${dock}</td>
        <td class="col-num">${drive}</td>
        <td class="col-mid">${trailer}</td>
        <td class="col-mid">${avail}</td>
        <td class="col-mid">${rate}</td>
      </tr>
    `;
  }).join("");

  const detailPages = includeDetails
    ? sorted.map((l) => renderDetailPage(l, primary, secondary)).join("")
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  @page {
    @bottom-right {
      content: "Page " counter(page) " of " counter(pages);
      font-size: 9pt;
      color: #64748b;
    }
  }

  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    color: #0f172a;
    margin: 0;
    padding: 0;
    line-height: 1.45;
  }

  /* Page wrapper */
  .page { page-break-after: always; }
  .page:last-child { page-break-after: auto; }

  /* Brand / typography */
  .muted { color: #64748b; }
  .small { font-size: 9.5pt; }
  .tiny { font-size: 8.5pt; }

  .h1 { font-size: 28pt; font-weight: 900; letter-spacing: -0.02em; margin: 0; }
  .h2 { font-size: 14pt; font-weight: 800; margin: 0; }
  .h3 { font-size: 10pt; font-weight: 800; margin: 0; letter-spacing: 0.04em; text-transform: uppercase; color: #334155; }

  /* Cards */
  .card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 14px 16px;
  }
  .card.soft {
    background: #f8fafc;
    border-color: #e2e8f0;
  }

  /* COVER */
  .cover {
    min-height: 100%;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .cover-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }
  .logo {
    height: 34px;
    width: auto;
  }
  .cover-meta {
    text-align: right;
  }
  .pill {
    display: inline-block;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 9pt;
    color: #334155;
    font-weight: 700;
  }
  .cover-stats {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
  }
  .stat {
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    background: #ffffff;
  }
  .stat .k { font-size: 8.5pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }
  .stat .v { font-size: 16pt; font-weight: 900; margin-top: 2px; }

  .cover-footer {
    margin-top: auto;
    border-top: 1px solid #e2e8f0;
    padding-top: 12px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px 20px;
  }
  .contact b { display:block; font-size: 10pt; margin-bottom: 2px; }
  .contact span { font-size: 9pt; color: #334155; }

  /* SUMMARY TABLE */
  .summary-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
    margin-bottom: 10px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
  }
  thead th {
    text-align: left;
    background: #f1f5f9;
    padding: 10px 8px;
    border-bottom: 2px solid #e2e8f0;
    color: #334155;
    font-weight: 800;
    white-space: nowrap;
  }
  tbody td {
    padding: 10px 8px;
    border-bottom: 1px solid #e5e7eb;
    vertical-align: top;
  }
  tbody tr:nth-child(even) { background: #fafafa; }

  .col-prop { width: 34%; }
  .prop-name { font-weight: 900; font-size: 9.5pt; }
  .prop-sub { font-size: 8pt; color: #64748b; margin-top: 2px; }

  .col-num { text-align: right; width: 9%; }
  .col-mid { width: 11%; }

  .note-line {
    margin-top: 10px;
    font-size: 8.5pt;
    color: #64748b;
  }

  /* DETAIL PAGES */
  .detail-header {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: flex-start;
  }
  .detail-title { font-size: 18pt; font-weight: 900; margin: 0; letter-spacing: -0.01em; }
  .detail-sub { margin-top: 4px; font-size: 10pt; color: #64748b; }

  .grid {
    margin-top: 12px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .kv { padding: 12px 14px; }
  .kv .k { font-size: 8.5pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }
  .kv .v { font-size: 12pt; font-weight: 900; margin-top: 2px; }

  .detail-notes {
    margin-top: 12px;
  }
  .clamp {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="page cover">

  <div class="cover-top">
    <div>
      ${issue.logo_url ? `<img src="${escapeHtml(issue.logo_url)}" class="logo" alt="Logo" />` : `<div class="h3">Availability Snapshot</div>`}
    </div>

    <div class="cover-meta">
      <div class="pill">${escapeHtml(market)}</div>
      <div class="small muted" style="margin-top:6px;">Published ${escapeHtml(published)}</div>
    </div>
  </div>

  <div>
    <h1 class="h1">${escapeHtml(title)}</h1>
    <p class="small muted" style="margin-top:6px;">
      Curated distribution / logistics space above ${escapeHtml(sizeThreshold)} SF.
      Built for quick scanning — details available on request.
    </p>
  </div>

  <div class="cover-stats">
    <div class="stat">
      <div class="k">Tracked</div>
      <div class="v">${total}</div>
    </div>
    <div class="stat">
      <div class="k">Earliest Availability</div>
      <div class="v">${escapeHtml(earliest)}</div>
    </div>
    <div class="stat">
      <div class="k">New This Period</div>
      <div class="v">${newCount || 0}</div>
    </div>
  </div>

  <div class="card soft">
    <div class="h3">How to use this</div>
    <p class="small" style="margin-top:6px;">
      The next page is the full scan list. If any space is close, reply with the ListingID and we'll confirm timing, trailer parking, and tour access.
    </p>
  </div>

  <div class="cover-footer">
    <div class="contact">
      <b>${escapeHtml(primary.name)}</b>
      <span>${escapeHtml(primary.email)}${primary.phone ? ` | ${escapeHtml(primary.phone)}` : ""}</span>
    </div>
    <div class="contact">
      <b>${escapeHtml(secondary.name)}</b>
      <span>${escapeHtml(secondary.email)}${secondary.phone ? ` | ${escapeHtml(secondary.phone)}` : ""}</span>
    </div>

    <div class="tiny muted" style="grid-column: 1 / -1; margin-top:8px;">
      Information believed reliable but not guaranteed. Rates/availability subject to change.
    </div>
  </div>
</div>

<!-- SUMMARY TABLE PAGE -->
<div class="page">
  <div class="summary-head">
    <div>
      <h2 class="h2">Availability Summary</h2>
      <p class="tiny muted" style="margin-top:4px;">
        Trailer parking shown only where confirmed. "Market" = asking rate not publicly stated.
      </p>
    </div>

    <div class="pill">
      ${escapeHtml(market)}<br />
      <span class="tiny muted">Threshold: ${escapeHtml(sizeThreshold)} SF</span>
    </div>
  </div>

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

  <p class="note-line">
    Tip: Reply with ListingIDs to shortlist. If timing is 6–24 months, ask early — off-market options may exist.
  </p>
</div>

${detailPages}

</body>
</html>`;
}

function renderDetailPage(l: any, primary: any, secondary: any) {
  const title = escapeHtml(l.display_address || l.address || "");
  const loc = escapeHtml([l.city, l.submarket].filter(Boolean).join(" • "));
  const size = fmtNum(l.size_sf);
  const clear = l.clear_height_ft ? `${l.clear_height_ft}'` : "—";
  const dock = l.dock_doors ?? "—";
  const drive = l.drive_in_doors ?? "—";
  const trailer = normalizeYesNoUnknown(l.trailer_parking);
  const avail = escapeHtml(l.availability_date || "TBD");
  const rate = escapeHtml(l.asking_rate_psf || "Market");
  const notes = (l.notes_public || "").trim();

  return `
<div class="page">

  <div class="detail-header">
    <div>
      <h2 class="detail-title">${title}</h2>
      <div class="detail-sub">${loc}</div>
      <div class="tiny muted">ListingID: ${escapeHtml(l.listing_id || "—")}</div>
    </div>
    ${l.photo_url ? `<img src="${escapeHtml(l.photo_url)}" style="width:140px; height:auto; border-radius:8px; object-fit:cover;" alt="Property" />` : ""}
  </div>

  <div class="grid">
    <div class="card kv"><div class="k">Total Area</div><div class="v">${size} SF</div></div>
    <div class="card kv"><div class="k">Clear Height</div><div class="v">${clear}</div></div>
    <div class="card kv"><div class="k">Dock Doors</div><div class="v">${dock}</div></div>
    <div class="card kv"><div class="k">Drive-In Doors</div><div class="v">${drive}</div></div>
    <div class="card kv"><div class="k">Trailer Parking</div><div class="v">${trailer}</div></div>
    <div class="card kv"><div class="k">Availability</div><div class="v">${avail}</div></div>
    <div class="card kv"><div class="k">Asking Rate</div><div class="v">${rate}</div></div>
    <div class="card kv"><div class="k">Submarket</div><div class="v">${escapeHtml(l.submarket || "—")}</div></div>
  </div>
  ${notes ? `
  <div class="card soft detail-notes">
    <div class="h3">Notes</div>
    <p class="small clamp" style="margin-top:6px;">${escapeHtml(notes)}</p>
  </div>` : ""}

  <div class="card soft" style="margin-top:12px;">
    <div class="h3">Tours / Details</div>
    <p class="small" style="margin-top:6px;">
      ${escapeHtml(primary.name)} — ${escapeHtml(primary.email)}${primary.phone ? ` | ${escapeHtml(primary.phone)}` : ""}<br/>
      ${escapeHtml(secondary.name)} — ${escapeHtml(secondary.email)}${secondary.phone ? ` | ${escapeHtml(secondary.phone)}` : ""}
    </p>
  </div>
</div>`;
}

// ============ HELPER FUNCTIONS ============

function fmtNum(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return Math.round(n).toLocaleString();
}

function escapeHtml(s: any) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeYesNoUnknown(v: any): string {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return "—";
  if (["yes", "y", "true", "1"].includes(s)) return "Yes";
  if (["no", "n", "false", "0"].includes(s)) return "No";
  if (["unknown", "tbd"].includes(s)) return "—";
  // if someone types a custom note like "Limited"
  return escapeHtml(v);
}

// Robust-ish earliest availability: puts "Immediate" first, "TBD" last.
function computeEarliestAvailability(listings: any[]): string {
  const rank = (v: string) => {
    const s = (v || "").toLowerCase().trim();
    if (!s || s === "tbd" || s === "unknown") return 999999;
    if (s.includes("immediate")) return 0;
    // Try parse ISO date
    const t = Date.parse(v);
    if (!Number.isNaN(t)) return t;
    // Quarters like "Q4 2025"
    const m = s.match(/q([1-4])\s*(20\d{2})/i);
    if (m) {
      const q = Number(m[1]);
      const y = Number(m[2]);
      const month = (q - 1) * 3; // 0,3,6,9
      return Date.UTC(y, month, 1);
    }
    return 900000; // unknown format
  };

  let best = "";
  let bestRank = 9999999;

  for (const l of listings) {
    const v = String(l.availability_date || "TBD");
    const r = rank(v);
    if (r < bestRank) {
      bestRank = r;
      best = v;
    }
  }
  return best || "TBD";
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
