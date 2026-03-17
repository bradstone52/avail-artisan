/**
 * IndustrialStandard/index.tsx
 *
 * 3-page industrial brochure assembled from reusable section components.
 * Consumes only BrochureData — never reads listing props directly.
 *
 * ADOBE EXPRESS NOTE:
 * When you supply the AE visual reference:
 *  1. Update tokens.ts colors to match the AE palette
 *  2. Adjust hero image height on Page1 (currently 240pt)
 *  3. Change section ordering below if AE template differs
 *  4. Replace the simple two-column cover layout if AE uses a full-bleed hero
 */
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { BrochureHeader }     from '../../sections/BrochureHeader';
import { BrochureFooter }     from '../../sections/BrochureFooter';
import { SpecTable }          from '../../sections/SpecTable';
import { PricingBlock }       from '../../sections/PricingCard';
import { SnapshotBand }       from '../../sections/SnapshotBand';
import { HighlightsList }     from '../../sections/HighlightsList';
import { MapSection }         from '../../sections/MapSection';
import { PhotoStrip }         from '../../sections/PhotoStrip';
import { ConfidentialBlock }  from '../../sections/ConfidentialBlock';
import { C }                  from '../../styles/tokens';
import type { BrochureData }  from '@/lib/brochures/brochureTypes';

// ─── Page-level styles ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 9,
    fontFamily: 'Helvetica',
    backgroundColor: C.white,
  },
  // Cover
  heroImage: { width: '100%', height: 240, objectFit: 'cover' as const },
  coverBody: { paddingHorizontal: 36, paddingTop: 14 },
  coverAddress: { fontSize: 18, fontWeight: 'bold', color: C.black, marginBottom: 2 },
  coverSubline: { fontSize: 10, color: C.mid, marginBottom: 10 },
  accentBar: { width: 50, height: 3, backgroundColor: C.yellow, marginBottom: 12 },
  coverHeadline: {
    fontSize: 13,
    fontWeight: 'bold',
    color: C.accent,
    lineHeight: 1.3,
    marginBottom: 6,
  },
  coverDescription: {
    fontSize: 8.5,
    lineHeight: 1.55,
    color: C.dark,
    textAlign: 'justify' as const,
    marginBottom: 12,
  },
  coverTwoCol: { flexDirection: 'row' as const, gap: 16 },
  coverCol: { flex: 1 },
  coverSecondaryPhoto: {
    width: '100%',
    height: 140,
    objectFit: 'cover' as const,
    borderWidth: 0.5,
    borderColor: C.border,
    marginTop: 6,
  },
  // Specs / Map page
  pageInner: { paddingHorizontal: 36, paddingTop: 10 },
  twoCol: { flexDirection: 'row' as const, gap: 14 },
  colMain: { flex: 3 },
  colSide: { flex: 2 },
});

interface IndustrialStandardBrochureProps {
  data: BrochureData;
}

export function IndustrialStandardBrochure({ data }: IndustrialStandardBrochureProps) {
  const { cover, copy, specs, features, financials, snapshots, pricing, location, gallery, broker, disclaimer, visibility, dealTypeLabel } = data;

  return (
    <Document>
      {/* ═══ PAGE 1 – COVER ═══════════════════════════════════════════════════ */}
      <Page size="LETTER" style={s.page}>
        <BrochureHeader dealTypeLabel={dealTypeLabel} />

        {cover.heroPhotoUrl && visibility.cover && (
          <Image src={cover.heroPhotoUrl} style={s.heroImage} />
        )}

        <View style={s.coverBody}>
          <Text style={s.coverAddress}>{cover.displayAddress}</Text>
          <Text style={s.coverSubline}>
            {cover.city}, Alberta | {cover.submarket}
          </Text>
          <View style={s.accentBar} />
          <Text style={s.coverHeadline}>{copy.headline}</Text>

          <View style={s.coverTwoCol}>
            <View style={s.coverCol}>
              {visibility.description && (
                <Text style={s.coverDescription}>{copy.description}</Text>
              )}
            </View>
            <View style={s.coverCol}>
              {visibility.tagline && (
                <Text style={s.coverDescription}>{copy.tagline}</Text>
              )}
              {cover.secondaryPhotoUrl && (
                <Image src={cover.secondaryPhotoUrl} style={s.coverSecondaryPhoto} />
              )}
            </View>
          </View>
        </View>

        {visibility.footer && (
          <BrochureFooter address={cover.displayAddress} city={cover.city} disclaimer={disclaimer} />
        )}
      </Page>

      {/* ═══ PAGE 2 – SPECS, PRICING & MAP ════════════════════════════════════ */}
      <Page size="LETTER" style={s.page}>
        <BrochureHeader dealTypeLabel={dealTypeLabel} />

        <View style={s.pageInner}>
          <View style={s.twoCol}>
            {/* Left: Specs */}
            <View style={s.colMain}>
              {visibility.specs && (
                <SpecTable rows={specs} features={features} />
              )}
              {financials.length > 0 && visibility.specs && (
                <SpecTable rows={financials} title="Additional Costs" />
              )}
            </View>

            {/* Right: Pricing + Map */}
            <View style={s.colSide}>
              {visibility.pricing && (
                <PricingBlock pricing={pricing} />
              )}
              {visibility.map && (
                <MapSection location={location} topSpacing={pricing.show ? 10 : 0} />
              )}
            </View>
          </View>
        </View>

        {visibility.footer && (
          <BrochureFooter address={cover.displayAddress} city={cover.city} disclaimer={disclaimer} />
        )}
      </Page>

      {/* ═══ PAGE 3 – HIGHLIGHTS, GALLERY & BROKER NOTES ══════════════════════ */}
      <Page size="LETTER" style={s.page}>
        <BrochureHeader dealTypeLabel={dealTypeLabel} />

        <View style={s.pageInner}>
          {snapshots.length > 0 && (
            <SnapshotBand snapshots={snapshots} />
          )}

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

        {visibility.footer && (
          <BrochureFooter address={cover.displayAddress} city={cover.city} disclaimer={disclaimer} />
        )}
      </Page>
    </Document>
  );
}
