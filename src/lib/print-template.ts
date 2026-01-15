/**
 * Shared Print Template for PDF Generation
 * 
 * This module provides a single source of truth for the HTML + CSS used by:
 * 1. The in-app /print-preview route
 * 2. The DocRaptor edge function
 * 
 * DO NOT duplicate print CSS elsewhere. All print styling should be defined here.
 */

// Types for template data
export interface PrintTemplateListing {
  id?: string;
  listing_id: string;
  property_name: string | null;
  display_address?: string | null;
  address: string;
  city: string;
  submarket: string;
  size_sf: number;
  clear_height_ft: number | null;
  dock_doors: number | null;
  drive_in_doors: number | null;
  availability_date: string | null;
  notes_public: string | null;
  trailer_parking?: string | null;
}

export interface PrintTemplateContact {
  name: string;
  email: string;
  phone: string;
}

export interface PrintTemplateData {
  title: string;
  market: string;
  sizeThreshold: number;
  sizeThresholdMax: number;
  listings: PrintTemplateListing[];
  primary: PrintTemplateContact;
  secondary: PrintTemplateContact;
  newCount: number;
  includeDetails?: boolean;
  executiveNotes?: Record<string, string>;
  coverImageUrl?: string;
  debugMode?: boolean;
}

// Default contacts
export const DEFAULT_PRIMARY_CONTACT: PrintTemplateContact = {
  name: "Brad Stone",
  email: "brad@cvpartners.ca",
  phone: "(403) 613-2898",
};

export const DEFAULT_SECONDARY_CONTACT: PrintTemplateContact = {
  name: "Doug Johannson",
  email: "doug@cvpartners.ca",
  phone: "(403) 470-8875",
};

// Default cover image
const DEFAULT_COVER_IMAGE = "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&q=80";

/**
 * Escape HTML special characters
 */
function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Format number with thousand separators
 */
function fmtNum(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return Math.round(n).toLocaleString();
}

/**
 * Normalize yes/no values
 */
function normalizeYesNo(v: string | null | undefined): string {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return '—';
  if (['yes', 'y', 'true', '1'].includes(s)) return 'Yes';
  if (['no', 'n', 'false', '0'].includes(s)) return 'No';
  if (['unknown', 'tbd'].includes(s)) return '—';
  return v || '—';
}

/**
 * Generate a simple hash for debug comparison
 */
export function generateHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * The complete CSS for print styling
 * This is the SINGLE source of truth for all print styles
 */
export const PRINT_STYLES = `
/* ============ NEO-BRUTALIST PDF STYLES ============ */
/* Single source of truth - used by both preview and DocRaptor */

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
.cover-hero {
  width: 100%;
  height: 40vh;
  background-size: cover;
  background-position: center;
}

.cover-content {
  flex: 1;
  padding: 40px 48px;
  display: flex;
  flex-direction: column;
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
  margin-bottom: 32px;
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

.cover-stats {
  display: flex;
  gap: 48px;
  margin-bottom: 48px;
}

.cover-stat {
  display: flex;
  flex-direction: column;
}

.cover-stat-value {
  font-size: 32pt;
  font-weight: 900;
  color: var(--ink);
  line-height: 1;
}

.cover-stat-label {
  font-size: 10pt;
  font-weight: 500;
  color: var(--muted);
  margin-top: 4px;
}

.cover-contacts {
  border-top: 3px solid var(--ink);
  padding-top: 24px;
  display: flex;
  gap: 60px;
}

.contact-block {
  flex: 1;
}

.contact-block .contact-name {
  font-size: 13pt;
  font-weight: 800;
  color: var(--ink);
  margin-bottom: 6px;
}

.contact-block .contact-detail {
  font-size: 11pt;
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

tbody tr.alt {
  background: var(--table-stripe);
}

tbody tr:last-child td {
  border-bottom: none;
}

.col-prop { width: 26%; }
.col-city { width: 12%; }
.col-num { width: 10%; }
.col-mid { width: 10%; }
.col-trailer { width: 10%; }
.col-avail { width: 12%; }

.prop-name {
  display: block;
  font-weight: 700;
  color: var(--ink);
  font-size: 8pt;
}

.prop-sub {
  display: block;
  font-size: 7pt;
  color: var(--muted);
  margin-top: 2px;
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

/* ============ DEBUG INFO ============ */
.debug-info {
  position: fixed;
  top: 0;
  left: 0;
  background: #fef08a;
  border: 2px solid #000;
  padding: 8px 12px;
  font-size: 10px;
  font-family: monospace;
  z-index: 9999;
}
`;

/**
 * Build a summary table row for a listing
 */
function buildSummaryRow(listing: PrintTemplateListing, index: number): string {
  const property = esc(listing.property_name || listing.display_address || listing.address || "—");
  const submarket = esc(listing.submarket || "");
  const city = esc(listing.city || "—");
  const size = fmtNum(listing.size_sf);
  const clear = listing.clear_height_ft ? `${listing.clear_height_ft}'` : "—";
  const dock = listing.dock_doors != null ? String(listing.dock_doors) : "—";
  const drive = listing.drive_in_doors != null ? String(listing.drive_in_doors) : "—";
  const trailer = normalizeYesNo(listing.trailer_parking);
  const avail = esc(listing.availability_date || "TBD");
  const rowClass = index % 2 === 1 ? ' class="alt"' : '';

  return `<tr${rowClass}>
    <td class="col-prop"><span class="prop-name">${property}</span><span class="prop-sub">${submarket}</span></td>
    <td class="col-city">${city}</td>
    <td class="col-num">${size}</td>
    <td class="col-num">${clear}</td>
    <td class="col-num">${dock}</td>
    <td class="col-num">${drive}</td>
    <td class="col-trailer">${trailer}</td>
    <td class="col-avail">${avail}</td>
  </tr>`;
}

/**
 * Build a detail page for a listing
 */
function buildDetailPage(
  listing: PrintTemplateListing, 
  primary: PrintTemplateContact, 
  secondary: PrintTemplateContact,
  executiveNote?: string
): string {
  const title = esc(listing.property_name || listing.display_address || listing.address || "Property");
  const loc = esc([listing.city, listing.submarket].filter(Boolean).join(" · "));
  const size = fmtNum(listing.size_sf);
  const clear = listing.clear_height_ft ? `${listing.clear_height_ft}'` : "—";
  const dock = listing.dock_doors != null ? String(listing.dock_doors) : "—";
  const drive = listing.drive_in_doors != null ? String(listing.drive_in_doors) : "—";
  const trailer = normalizeYesNo(listing.trailer_parking);
  const avail = esc(listing.availability_date || "TBD");
  const notes = executiveNote || (listing.notes_public || "").trim();

  return `
<div class="page">
  <div class="detail-header">
    <h2 class="detail-title">${title}</h2>
    <p class="detail-location">${loc}</p>
    ${listing.listing_id ? `<p class="detail-id">ID: ${esc(listing.listing_id)}</p>` : ""}
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
      <div class="spec-label">Trailer Parking</div>
      <div class="spec-value">${trailer}</div>
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
</div>`;
}

/**
 * Build the complete HTML document for print/PDF
 * This is the SINGLE source of truth for the print template
 */
export function buildPrintHtml(data: PrintTemplateData): string {
  const {
    title,
    market,
    sizeThreshold,
    sizeThresholdMax,
    listings,
    primary,
    secondary,
    newCount,
    includeDetails = false,
    executiveNotes = {},
    coverImageUrl = DEFAULT_COVER_IMAGE,
    debugMode = false,
  } = data;

  const sizeThresholdStr = sizeThreshold.toLocaleString();
  const sizeThresholdMaxStr = sizeThresholdMax.toLocaleString();
  const total = listings.length;

  // Sort listings by size descending
  const sorted = [...listings].sort((a, b) => (Number(b.size_sf || 0) - Number(a.size_sf || 0)));

  // Build summary rows
  const summaryRows = sorted.map((l, idx) => buildSummaryRow(l, idx)).join("");

  // Build detail pages if requested
  const detailPages = includeDetails
    ? sorted.map((l) => buildDetailPage(l, primary, secondary, executiveNotes[l.id || l.listing_id])).join("")
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${esc(title)}</title>
<style>
${PRINT_STYLES}
</style>
</head>
<body>

${debugMode ? `<div class="debug-info">Debug: HTML Length=${0} Hash=PENDING</div>` : ''}

<!-- PAGE 1: COVER -->
<div class="page-cover">
  <div class="cover-hero" style="background-image: url('${coverImageUrl}');"></div>
  <div class="cover-content">
    <div class="cover-brand">ClearView Commercial Realty Inc.</div>
    
    <h1 class="cover-title">${esc(title)}</h1>
    <p class="cover-subtitle">${esc(market)} · ${esc(sizeThresholdStr)}–${esc(sizeThresholdMaxStr)} SF</p>
    
    <div class="cover-stats">
      <div class="cover-stat">
        <div class="cover-stat-value">${total}</div>
        <div class="cover-stat-label">Tracked</div>
      </div>
      <div class="cover-stat">
        <div class="cover-stat-value">${newCount}</div>
        <div class="cover-stat-label">New</div>
      </div>
    </div>

    <div class="cover-contacts">
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
</div>

<!-- PAGE 2: SUMMARY TABLE -->
<div class="page">
  <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px;">
    <div>
      <h2 class="text-headline">Availability Summary</h2>
      <p style="font-size: 8pt; color: var(--muted); margin-top: 4px;">${esc(market)} · ${esc(sizeThresholdStr)}–${esc(sizeThresholdMaxStr)} SF</p>
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
          <th class="col-num">Clear</th>
          <th class="col-num">Dock</th>
          <th class="col-num">Drive</th>
          <th class="col-trailer">Trailer</th>
          <th class="col-avail">Avail.</th>
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

  // If debug mode, update with actual values
  if (debugMode) {
    const hash = generateHash(html);
    return html.replace('Hash=PENDING', `Hash=${hash}`).replace('HTML Length=0', `HTML Length=${html.length}`);
  }

  return html;
}

/**
 * Debug helper to log template info
 */
export function logTemplateDebug(context: string, html: string): void {
  const hash = generateHash(html);
  console.log(`[PrintTemplate:${context}] HTML Length: ${html.length}, Hash: ${hash}`);
}
