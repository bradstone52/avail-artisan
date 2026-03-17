/**
 * IndustrialStandard/index.tsx
 *
 * 3-page industrial brochure — clean institutional layout.
 *
 * PAGE 1 — Cover
 *   Full-bleed hero image → navy header bar (address, city, submarket) →
 *   two-column body: headline/tagline/description left, secondary photo right →
 *   thin footer
 *
 * PAGE 2 — Specifications & Pricing
 *   Wide spec table left (60%) · pricing card + map right (40%)
 *
 * PAGE 3 — Highlights, Gallery & Broker Notes
 *   Navy snapshot band → two-column highlights → photo strip → broker notes
 *
 * Design intent:
 *   - Restrained, print-calibrated commercial brokerage style
 *   - Deep navy + gold accent, warm off-white page
 *   - Strong typographic hierarchy, no decorative clutter
 *   - Every element earns its space
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

// ─── Shared page geometry ────────────────────────────────────────────────────
const PAGE_H_PADDING = 40;
const PAGE_BODY_TOP  = 14;
const FOOTER_HEIGHT  = 36; // clearance above absolute footer

const s = StyleSheet.create({
  page: {
    fontSize:        9,
    fontFamily:      'Helvetica',
    backgroundColor: C.pageBg,
    paddingBottom:   FOOTER_HEIGHT,
  },

  // ── Page 1: Cover ──────────────────────────────────────────────────────────
  heroImage: {
    width:      '100%',
    height:     252,
    objectFit:  'cover' as const,
  },

  // Address identity block — sits over a solid navy bar below the hero
  identityBar: {
    backgroundColor:   C.navy,
    paddingHorizontal: PAGE_H_PADDING,
    paddingVertical:   10,
    flexDirection:     'row' as const,
    justifyContent:    'space-between',
    alignItems:        'flex-end',
  },
  identityLeft:    {},
  addressLine: {
    fontSize:   16,
    fontWeight: 'bold',
    color:      C.white,
    marginBottom: 2,
  },
  subLine: {
    fontSize:      8,
    color:         '#a0b4c8',
    letterSpacing: 0.4,
  },
  listingNum: {
    fontSize:  7,
    color:     '#a0b4c8',
    textAlign: 'right' as const,
    marginBottom: 2,
  },

  // Thin gold rule
  goldRule: {
    height:          2,
    backgroundColor: C.gold,
    marginHorizontal: PAGE_H_PADDING,
  },

  // Cover body
  coverBody: {
    paddingHorizontal: PAGE_H_PADDING,
    paddingTop:        14,
    flexDirection:     'row' as const,
    gap:               20,
  },
  coverColLeft:  { flex: 3 },
  coverColRight: { flex: 2 },

  coverHeadline: {
    fontSize:     13,
    fontWeight:   'bold',
    color:        C.navy,
    lineHeight:   1.25,
    marginBottom: 5,
  },
  coverTagline: {
    fontSize:     8.5,
    color:        C.inkMid,
    marginBottom: 10,
    fontStyle:    'italic',
  },
  coverDesc: {
    fontSize:   8,
    lineHeight: 1.6,
    color:      C.inkDark,
  },
  secondaryPhoto: {
    width:        '100%',
    height:       130,
    objectFit:    'cover' as const,
    borderWidth:  0.5,
    borderColor:  C.border,
    marginBottom: 8,
  },

  // ── Page 2: Specs ──────────────────────────────────────────────────────────
  pageBody: {
    paddingHorizontal: PAGE_H_PADDING,
    paddingTop:        PAGE_BODY_TOP,
  },
  twoCol:  { flexDirection: 'row' as const, gap: 18 },
  colMain: { flex: 3 },
  colSide: { flex: 2 },

  // ── Page 3: Highlights / Gallery ──────────────────────────────────────────
  // (uses pageBody + standard section components)
});

interface IndustrialStandardBrochureProps { data: BrochureData; }

export function IndustrialStandardBrochure({ data }: IndustrialStandardBrochureProps) {
  const {
    cover, copy, specs, features, financials,
    snapshots, pricing, location, gallery,
    broker, disclaimer, visibility,
    dealTypeLabel, listingNumber,
  } = data;

  return (
    <Document>

      {/* ═══════════════════════════════════════════════════════════════════
          PAGE 1 — COVER
      ═══════════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={s.page}>
        <BrochureHeader dealTypeLabel={dealTypeLabel} />

        {/* Hero image */}
        {cover.heroPhotoUrl && visibility.cover && (
          <Image src={cover.heroPhotoUrl} style={s.heroImage} />
        )}

        {/* Navy identity bar */}
        <View style={s.identityBar}>
          <View style={s.identityLeft}>
            <Text style={s.addressLine}>{cover.displayAddress}</Text>
            <Text style={s.subLine}>
              {cover.city}, Alberta{cover.submarket ? `  ·  ${cover.submarket}` : ''}
            </Text>
          </View>
          {listingNumber && (
            <Text style={s.listingNum}>{listingNumber}</Text>
          )}
        </View>

        {/* Gold rule */}
        <View style={s.goldRule} />

        {/* Body: headline + description left, secondary photo right */}
        <View style={s.coverBody}>
          <View style={s.coverColLeft}>
            <Text style={s.coverHeadline}>{copy.headline}</Text>
            {visibility.tagline && (
              <Text style={s.coverTagline}>{copy.tagline}</Text>
            )}
            {visibility.description && (
              <Text style={s.coverDesc}>{copy.description}</Text>
            )}
          </View>

          <View style={s.coverColRight}>
            {cover.secondaryPhotoUrl && (
              <Image src={cover.secondaryPhotoUrl} style={s.secondaryPhoto} />
            )}
            {/* Quick-hit specs in right column if there are key ones */}
            {snapshots.slice(0, 4).map((snap, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: C.border }}>
                <Text style={{ fontSize: 7, color: C.inkMid, textTransform: 'uppercase', letterSpacing: 0.5 }}>{snap.label}</Text>
                <Text style={{ fontSize: 8, fontWeight: 'bold', color: C.navy }}>{snap.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <BrochureFooter address={cover.displayAddress} city={cover.city} disclaimer={disclaimer} />
      </Page>

      {/* ═══════════════════════════════════════════════════════════════════
          PAGE 2 — SPECIFICATIONS & PRICING
      ═══════════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={s.page}>
        <BrochureHeader dealTypeLabel={dealTypeLabel} />

        <View style={s.pageBody}>
          <View style={s.twoCol}>

            {/* Left column: spec table + financials */}
            <View style={s.colMain}>
              {visibility.specs && (
                <SpecTable rows={specs} features={features} />
              )}
              {financials.length > 0 && visibility.specs && (
                <SpecTable rows={financials} title="Additional Costs" />
              )}
            </View>

            {/* Right column: pricing card + map */}
            <View style={s.colSide}>
              {visibility.pricing && (
                <PricingBlock pricing={pricing} />
              )}
              {visibility.map && (
                <MapSection location={location} topSpacing={pricing.show ? 0 : 0} />
              )}
            </View>

          </View>
        </View>

        <BrochureFooter address={cover.displayAddress} city={cover.city} disclaimer={disclaimer} />
      </Page>

      {/* ═══════════════════════════════════════════════════════════════════
          PAGE 3 — HIGHLIGHTS, GALLERY & BROKER NOTES
      ═══════════════════════════════════════════════════════════════════ */}
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
