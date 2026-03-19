/**
 * IndustrialStandard/index.tsx
 *
 * 3-page institutional industrial CRE brochure.
 * Design modeled on CBRE/JLL/Colliers reference brochures:
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PAGE 1 — COVER
 *   • Full-bleed hero image (fills top ~55% of page)
 *   • White area below: deal type badge (small) | large address headline
 *   • City/submarket subtitle
 *   • Tagline / description (if enabled)
 *   • Listing number top-right in header
 *
 * PAGE 2 — SPECIFICATIONS
 *   • Two columns (60% / 40%)
 *       Left: "Property Details" spec table (hairline rows, bold labels)
 *             + Additional Costs table if present
 *             + Feature bullet list
 *       Right: Pricing (large typographic display) + Location map
 *
 * PAGE 3 — HIGHLIGHTS & GALLERY
 *   • Snapshot metrics band (white, hairline borders)
 *   • "Property Highlights" two-column + list
 *   • Photo strip (up to 3 photos)
 *   • Confidential broker notes (if enabled)
 *
 * Design principles:
 *   White-dominant. Clean hairlines only. Navy for headings/titles.
 *   Typography-first hierarchy. Print-calibrated.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { BrochureHeader }    from '../../sections/BrochureHeader';
import { BrochureFooter }    from '../../sections/BrochureFooter';
import { SpecTable }         from '../../sections/SpecTable';
import { PricingBlock }      from '../../sections/PricingCard';
import { SnapshotBand }      from '../../sections/SnapshotBand';
import { HighlightsList }    from '../../sections/HighlightsList';
import { MapSection }        from '../../sections/MapSection';
import { PhotoStrip }        from '../../sections/PhotoStrip';
import { ConfidentialBlock } from '../../sections/ConfidentialBlock';
import { C }                 from '../../styles/tokens';
import type { BrochureData } from '@/lib/brochures/brochureTypes';

// ─── Shared geometry ──────────────────────────────────────────────────────────
const PAD_H    = 40;   // horizontal page padding
const FOOTER_H = 34;   // space reserved for absolute footer

const s = StyleSheet.create({

  // ── Base page ──────────────────────────────────────────────────────────────
  page: {
    fontSize:        9,
    fontFamily:      'Helvetica',
    backgroundColor: C.pageBg,
    paddingBottom:   FOOTER_H,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — COVER
  // ═══════════════════════════════════════════════════════════════════════════

  heroImage: {
    width:     '100%',
    height:    295,
    objectFit: 'cover' as const,
  },

  // White lower section of cover page
  coverLower: {
    paddingHorizontal: PAD_H,
    paddingTop:        22,
    paddingBottom:     16,
    flexDirection:     'row' as const,
    gap:               32,
  },
  coverMain: { flex: 1 },
  coverSide: { width: 160 },

  // Deal type badge — small, uppercase, muted
  dealBadge: {
    fontSize:      6.5,
    fontWeight:    'bold',
    color:         C.inkMid,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.6,
    marginBottom:  6,
  },

  // Large address headline
  coverAddress: {
    fontSize:     22,
    fontWeight:   'bold',
    color:        C.inkDark,
    lineHeight:   1.2,
    marginBottom: 4,
  },
  coverCity: {
    fontSize:     11,
    color:        C.inkMid,
    marginBottom: 12,
  },

  // Tagline bar (green/navy tinted) — matches CBRE's teal highlight bar
  taglineBar: {
    backgroundColor: C.navy,
    paddingVertical:   6,
    paddingHorizontal: 10,
    marginBottom:      10,
    marginLeft:        -PAD_H,
    marginRight:       -PAD_H,
    marginTop:         0,
  },
  taglineText: {
    fontSize:   8,
    color:      C.white,
    fontWeight: 'bold',
  },

  coverDesc: {
    fontSize:   7.5,
    lineHeight: 1.65,
    color:      C.inkMid,
  },

  // Side — secondary photo + quick specs
  secondaryPhoto: {
    width:        '100%',
    height:       110,
    objectFit:    'cover' as const,
    borderWidth:  0.5,
    borderColor:  C.border,
    marginBottom: 10,
  },

  chipRow: {
    flexDirection:     'row' as const,
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingVertical:   4,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  chipLabel: {
    fontSize:      6,
    color:         C.inkMid,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
  chipValue: {
    fontSize:   7.5,
    fontWeight: 'bold',
    color:      C.navy,
    textAlign:  'right' as const,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2 — SPECIFICATIONS & PRICING
  // ═══════════════════════════════════════════════════════════════════════════

  pageBody: {
    paddingHorizontal: PAD_H,
    paddingTop:        20,
  },

  // Page title row
  pageTitle: {
    fontSize:     13,
    fontWeight:   'bold',
    color:        C.inkDark,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize:     8,
    color:        C.inkMid,
    marginBottom: 16,
  },
  pageTitleRule: {
    height:          1,
    backgroundColor: C.borderDark,
    marginBottom:    16,
  },

  twoCol:  { flexDirection: 'row' as const, gap: 28 },
  colMain: { flex: 60 },
  colSide: { flex: 40 },

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 3 — HIGHLIGHTS / GALLERY / NOTES
  // ═══════════════════════════════════════════════════════════════════════════
  // (uses pageBody + shared section components)
});

interface Props { data: BrochureData; }

export function IndustrialStandardBrochure({ data }: Props) {
  const {
    cover, copy, specs, features, financials,
    snapshots, pricing, location, gallery,
    broker, disclaimer, visibility,
    dealTypeLabel, listingNumber,
  } = data;

  return (
    <Document>

      {/* ─────────────────────────────────────────────────────────────────────
          PAGE 1 — COVER
      ───────────────────────────────────────────────────────────────────── */}
      <Page size="LETTER" style={s.page}>
        <BrochureHeader dealTypeLabel={dealTypeLabel} />

        {/* Hero image — full bleed */}
        {cover.heroPhotoUrl && visibility.cover && (
          <Image src={cover.heroPhotoUrl} style={s.heroImage} />
        )}

        {/* Cover lower — white area with address + side panel */}
        <View style={s.coverLower}>

          {/* Left — identity + copy */}
          <View style={s.coverMain}>
            <Text style={s.dealBadge}>{dealTypeLabel}</Text>
            <Text style={s.coverAddress}>{cover.displayAddress}</Text>
            <Text style={s.coverCity}>
              {cover.city}, Alberta{cover.submarket ? `  ·  ${cover.submarket}` : ''}
              {listingNumber ? `  ·  ${listingNumber}` : ''}
            </Text>

            {/* Tagline as a highlighted band */}
            {visibility.tagline && copy.tagline ? (
              <View style={s.taglineBar}>
                <Text style={s.taglineText}>{copy.tagline}</Text>
              </View>
            ) : null}

            {visibility.description && copy.description ? (
              <Text style={s.coverDesc}>{copy.description}</Text>
            ) : null}
          </View>

          {/* Right — secondary photo + quick spec chips */}
          <View style={s.coverSide}>
            {cover.secondaryPhotoUrl && (
              <Image src={cover.secondaryPhotoUrl} style={s.secondaryPhoto} />
            )}
            {snapshots.slice(0, 5).map((snap, i) => (
              <View key={i} style={s.chipRow}>
                <Text style={s.chipLabel}>{snap.label}</Text>
                <Text style={s.chipValue}>{snap.value}</Text>
              </View>
            ))}
          </View>

        </View>

        <BrochureFooter address={cover.displayAddress} city={cover.city} disclaimer={disclaimer} />
      </Page>

      {/* ─────────────────────────────────────────────────────────────────────
          PAGE 2 — SPECIFICATIONS & PRICING
      ───────────────────────────────────────────────────────────────────── */}
      <Page size="LETTER" style={s.page}>
        <BrochureHeader dealTypeLabel={dealTypeLabel} />

        <View style={s.pageBody}>

          {/* Page heading */}
          <Text style={s.pageTitle}>Property Overview</Text>
          <Text style={s.pageSubtitle}>{cover.displayAddress}  ·  {cover.city}, Alberta</Text>
          <View style={s.pageTitleRule} />

          <View style={s.twoCol}>

            {/* Left — spec tables */}
            <View style={s.colMain}>
              {visibility.specs && (
                <SpecTable rows={specs} features={features} />
              )}
              {financials.length > 0 && visibility.specs && (
                <SpecTable rows={financials} title="Additional Costs" />
              )}
            </View>

            {/* Right — pricing + map */}
            <View style={s.colSide}>
              {visibility.pricing && (
                <PricingBlock pricing={pricing} />
              )}
              {visibility.map && (
                <MapSection location={location} />
              )}
            </View>

          </View>
        </View>

        <BrochureFooter address={cover.displayAddress} city={cover.city} disclaimer={disclaimer} />
      </Page>

      {/* ─────────────────────────────────────────────────────────────────────
          PAGE 3 — HIGHLIGHTS, GALLERY & BROKER NOTES
      ───────────────────────────────────────────────────────────────────── */}
      <Page size="LETTER" style={s.page}>
        <BrochureHeader dealTypeLabel={dealTypeLabel} />

        <View style={s.pageBody}>
          {/* Page heading */}
          <Text style={s.pageTitle}>Property Highlights</Text>
          <Text style={s.pageSubtitle}>{cover.displayAddress}  ·  {cover.city}, Alberta</Text>
          <View style={s.pageTitleRule} />
        </View>

        {/* Snapshot metrics band — full bleed */}
        {snapshots.length > 0 && (
          <View style={{ paddingHorizontal: PAD_H }}>
            <SnapshotBand snapshots={snapshots} />
          </View>
        )}

        <View style={s.pageBody}>
          {visibility.highlights && (
            <HighlightsList highlights={copy.highlights} />
          )}
          {visibility.gallery && (
            <PhotoStrip photos={gallery} />
          )}
          {visibility.brokerNotes && broker.includeNotes && broker.notes && (
            <ConfidentialBlock notes={broker.notes} />
          )}
        </View>

        <BrochureFooter address={cover.displayAddress} city={cover.city} disclaimer={disclaimer} />
      </Page>

    </Document>
  );
}
