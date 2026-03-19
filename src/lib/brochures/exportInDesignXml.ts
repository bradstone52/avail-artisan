/**
 * exportInDesignXml.ts
 *
 * Converts a BrochureData object into an InDesign-compatible XML string.
 *
 * InDesign XML import workflow:
 *  1. Tag your InDesign text/image frames with the element names below
 *     (Window → Utilities → Tags panel, then tag each frame)
 *  2. Map tags to styles via Structure pane → Map Tags to Styles
 *  3. Import this XML: File → Import XML → check "Merge Content"
 *
 * Element names here MUST match the tag names you assign in InDesign.
 */

import type { BrochureData } from './brochureTypes';

function esc(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildInDesignXml(data: BrochureData): string {
  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<listing>');

  // ── Identity ──
  lines.push(`  <address>${esc(data.cover.displayAddress)}</address>`);
  lines.push(`  <city>${esc(data.cover.city)}</city>`);
  lines.push(`  <submarket>${esc(data.cover.submarket)}</submarket>`);
  lines.push(`  <dealType>${esc(data.dealTypeLabel)}</dealType>`);
  lines.push(`  <listingNumber>${esc(data.listingNumber ?? '')}</listingNumber>`);
  lines.push(`  <propertyType>${esc(data.propertyType ?? '')}</propertyType>`);

  // ── Copy ──
  lines.push(`  <headline>${esc(data.copy.headline)}</headline>`);
  lines.push(`  <tagline>${esc(data.copy.tagline)}</tagline>`);
  lines.push(`  <description>${esc(data.copy.description)}</description>`);

  // ── Highlights ──
  lines.push('  <highlights>');
  data.copy.highlights.forEach((h) => {
    lines.push(`    <highlight>${esc(h)}</highlight>`);
  });
  lines.push('  </highlights>');

  // ── Spec table ──
  lines.push('  <specs>');
  data.specs.forEach((row) => {
    lines.push(`    <spec label="${esc(row.label)}">${esc(row.value)}</spec>`);
  });
  lines.push('  </specs>');

  // ── Snapshot band (key metrics) ──
  lines.push('  <snapshots>');
  data.snapshots.forEach((row) => {
    lines.push(`    <snapshot label="${esc(row.label)}">${esc(row.value)}</snapshot>`);
  });
  lines.push('  </snapshots>');

  // ── Financials / Pricing ──
  if (data.pricing.show) {
    lines.push('  <pricing>');
    if (data.pricing.rent)  lines.push(`    <rent>${esc(data.pricing.rent)}</rent>`);
    if (data.pricing.price) lines.push(`    <price>${esc(data.pricing.price)}</price>`);
    lines.push('  </pricing>');
  }

  lines.push('  <financials>');
  data.financials.forEach((row) => {
    lines.push(`    <financial label="${esc(row.label)}">${esc(row.value)}</financial>`);
  });
  lines.push('  </financials>');

  // ── Broker notes (confidential) ──
  if (data.broker.includeNotes && data.broker.notes) {
    lines.push(`  <brokerNotes>${esc(data.broker.notes)}</brokerNotes>`);
  }

  // ── Disclaimer ──
  lines.push(`  <disclaimer>${esc(data.disclaimer)}</disclaimer>`);

  // ── Photo references (URLs only — InDesign links externally) ──
  lines.push('  <photos>');
  if (data.cover.heroPhotoUrl) {
    lines.push(`    <photo role="hero" src="${esc(data.cover.heroPhotoUrl)}" />`);
  }
  if (data.cover.secondaryPhotoUrl) {
    lines.push(`    <photo role="secondary" src="${esc(data.cover.secondaryPhotoUrl)}" />`);
  }
  data.gallery.forEach((p, i) => {
    lines.push(`    <photo role="gallery" index="${i}" src="${esc(p.photo_url)}" />`);
  });
  lines.push('  </photos>');

  lines.push('</listing>');

  return lines.join('\n');
}

/** Triggers a browser download of the XML file. */
export function downloadInDesignXml(data: BrochureData, filename?: string): void {
  const xml = buildInDesignXml(data);
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `brochure-${data.listingId}.xml`;
  a.click();
  URL.revokeObjectURL(url);
}
