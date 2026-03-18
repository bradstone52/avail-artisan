/**
 * IndustrialStandard/index.tsx
 *
 * 3-page institutional industrial CRE brochure.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PAGE 1 — COVER
 *   • Full-bleed hero image (fills ~55% of page height)
 *   • Navy identity bar: address (large) · city/submarket · listing number
 *   • 2px gold rule — visual anchor between identity bar and body
 *   • Two-column body:
 *       Left (60%): Headline → tagline → description
 *       Right (40%): Secondary photo → 4 quick-hit spec chips
 *
 * PAGE 2 — SPECIFICATIONS & PRICING
 *   • Two columns (62% / 38%)
 *       Left: Property Details spec table → Additional Costs table → features
 *       Right: Pricing card → Location map
 *
 * PAGE 3 — HIGHLIGHTS, GALLERY & BROKER NOTES
 *   • Full-width navy snapshot metrics band
 *   • Key Highlights two-column bullet list
 *   • Photo strip (up to 3 photos)
 *   • Confidential broker notes (if enabled)
 *
 * Design intent:
 *   Restrained, print-calibrated commercial brokerage aesthetic.
 *   Navy + gold accent. Warm off-white page.
 *   Consistent section heading treatment across all tables.
 *   Every element earns its space — no decorative noise.
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
const PAD_H      = 38;   // horizontal page padding
const BODY_TOP   = 16;   // top padding for body sections
const FOOTER_H   = 34;   // space reserved for absolute footer

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
    height:    248,
    objectFit: 'cover' as const,
  },

  // Navy identity bar — sits directly below hero
  identityBar: {
    backgroundColor:   C.navy,
    paddingHorizontal: PAD_H,
    paddingVertical:   11,
    flexDirection:     'row' as const,
    justifyContent:    'space-between',
    alignItems:        'flex-end',
  },
  identityLeft: { flex: 1 },
  addressLine: {
    fontSize:     17,
    fontWeight:   'bold',
    color:        C.white,
    lineHeight:   1.15,
    marginBottom: 3,
  },
  subLine: {
    fontSize:      7.5,
    color:         '#8faecc',
    letterSpacing: 0.3,
  },
  listingNumber: {
    fontSize:  6.5,
    color:     '#8faecc',
    textAlign: 'right' as const,
  },

  // Gold rule — 2 px, full bleed to identity bar padding
  goldRule: {
    height:           2,
    backgroundColor:  C.gold,
    marginHorizontal: PAD_H,
  },

  // Cover body: headline/description left, photo+chips right
  coverBody: {
    paddingHorizontal: PAD_H,
    paddingTop:        BODY_TOP,
    flexDirection:     'row' as const,
    gap:               20,
  },
  coverLeft:  { flex: 3 },
  coverRight: { flex: 2 },

  coverHeadline: {
    fontSize:     13,
    fontWeight:   'bold',
    color:        C.navy,
    lineHeight:   1.25,
    marginBottom: 5,
  },
  coverTagline: {
    fontSize:     8,
    color:        C.inkMid,
    fontStyle:    'italic' as const,
    marginBottom: 9,
  },
  coverDesc: {
    fontSize:   7.5,
    lineHeight: 1.65,
    color:      C.inkDark,
  },

  secondaryPhoto: {
    width:        '100%',
    height:       124,
    objectFit:    'cover' as const,
    borderWidth:  0.5,
    borderColor:  C.border,
    marginBottom: 8,
  },

  // Quick-hit spec chips in cover right column
  chipRow: {
    flexDirection:     'row' as const,
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingVertical:   4,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  chipLabel: {
    fontSize:      6.5,
    color:         C.inkMid,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
  chipValue: {
    fontSize:   8,
    fontWeight: 'bold',
    color:      C.navy,
    textAlign:  'right' as const,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2 — SPECIFICATIONS & PRICING
  // ═══════════════════════════════════════════════════════════════════════════

  pageBody: {
    paddingHorizontal: PAD_H,
    paddingTop:        BODY_TOP,
  },
  twoCol:  { flexDirection: 'row' as const, gap: 20 },
  colMain: { flex: 62 },   // ~62%
  colSide: { flex: 38 },   // ~38%

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 3 — HIGHLIGHTS / GALLERY / NOTES
  // (uses pageBody + shared section components)
  // ═══════════════════════════════════════════════════════════════════════════
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

        {/* Hero image */}
        {cover.heroPhotoUrl && visibility.cover && (
          <Image src={cover.heroPhotoUrl} style={s.heroImage} />
        )}

        {/* Identity bar */}
        <View style={s.identityBar}>
          <View style={s.identityLeft}>
            <Text style={s.addressLine}>{cover.displayAddress}</Text>
            <Text style={s.subLine}>
              {cover.city}, Alberta{cover.submarket ? `  ·  ${cover.submarket}` : ''}
            </Text>
          </View>
          {listingNumber && (
            <Text style={s.listingNumber}>{listingNumber}</Text>
          )}
        </View>

        {/* Gold rule */}
        <View style={s.goldRule} />

        {/* Body */}
        <View style={s.coverBody}>

          {/* Left — copy */}
          <View style={s.coverLeft}>
            <Text style={s.coverHeadline}>{copy.headline}</Text>
            {visibility.tagline && copy.tagline ? (
              <Text style={s.coverTagline}>{copy.tagline}</Text>
            ) : null}
            {visibility.description && copy.description ? (
              <Text style={s.coverDesc}>{copy.description}</Text>
            ) : null}
          </View>

          {/* Right — secondary photo + quick specs */}
          <View style={s.coverRight}>
            {cover.secondaryPhotoUrl && (
              <Image src={cover.secondaryPhotoUrl} style={s.secondaryPhoto} />
            )}
            {snapshots.slice(0, 4).map((snap, i) => (
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

        {/* Snapshot metrics band */}
        {snapshots.length > 0 && (
          <SnapshotBand snapshots={snapshots} />
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
