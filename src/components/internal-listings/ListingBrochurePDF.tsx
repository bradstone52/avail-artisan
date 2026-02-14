import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import clearviewLogo from '@/assets/clearview-logo.png';

export interface ListingPhoto {
  id: string;
  photo_url: string;
  caption: string | null;
}

export interface MarketingContent {
  headline: string;
  tagline: string;
  description: string;
  highlights: string[];
  broker_pitch: string;
}

export interface BrochureListingData {
  address: string;
  display_address?: string | null;
  city: string;
  submarket: string;
  deal_type: string;
  size_sf: number | null;
  warehouse_sf: number | null;
  office_sf: number | null;
  second_floor_office_sf?: number | null;
  land_acres: number | null;
  clear_height_ft: number | null;
  dock_doors: number | null;
  drive_in_doors: number | null;
  drive_in_door_dimensions?: (string | null)[] | null;
  asking_rent_psf: number | null;
  asking_sale_price: number | null;
  property_type: string | null;
  power: string | null;
  yard: string | null;
  zoning: string | null;
  loading_type: string | null;
  cam: number | null;
  op_costs: number | null;
  taxes: number | null;
  gross_rate: number | null;
  listing_number: string | null;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
  has_sprinklers?: boolean | null;
  sprinklers_esfr?: boolean | null;
  has_heated?: boolean | null;
  has_air_conditioning?: boolean | null;
  has_led_lighting?: boolean | null;
  has_rail_access?: boolean | null;
  has_mua?: boolean | null;
  mua_units?: number | null;
  mua_cfm_ratings?: (string | null)[] | null;
  additional_features?: string | null;
  estimated_annual_tax?: number | null;
  assessed_value?: number | null;
}

interface ListingBrochurePDFProps {
  listing: BrochureListingData;
  marketing: MarketingContent;
  includeConfidential?: boolean;
  staticMapUrl?: string;
  additionalPhotos?: ListingPhoto[];
}

// ── Colour palette ──────────────────────────────────────────────
const C = {
  black: '#1a1a1a',
  dark: '#333333',
  mid: '#666666',
  light: '#999999',
  border: '#d0d0d0',
  tableBg: '#f2f2f2',
  white: '#ffffff',
  accent: '#1e3a5f',
  accentLight: '#e8eef5',
  highlight: '#2563EB',
  yellow: '#D97706',
};

// ── Styles ──────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 9,
    fontFamily: 'Helvetica',
    backgroundColor: C.white,
  },

  /* header strip */
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingVertical: 10,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  logo: { width: 130, height: 28, objectFit: 'contain' as const },
  dealTypeBadge: {
    fontSize: 8,
    fontWeight: 'bold',
    color: C.white,
    backgroundColor: C.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },

  /* ── PAGE 1: COVER ─────────────────────────── */
  heroImage: { width: '100%', height: 240, objectFit: 'cover' as const },
  coverBody: { paddingHorizontal: 36, paddingTop: 14 },
  coverAddress: {
    fontSize: 18,
    fontWeight: 'bold',
    color: C.black,
    marginBottom: 2,
  },
  coverSubline: {
    fontSize: 10,
    color: C.mid,
    marginBottom: 10,
  },
  accentBar: {
    width: 50,
    height: 3,
    backgroundColor: C.yellow,
    marginBottom: 12,
  },
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

  /* ── PAGE 2: SPECS & MAP ─────────────────────── */
  pageInner: { paddingHorizontal: 36, paddingTop: 10 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: C.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1.5,
    borderBottomColor: C.accent,
  },
  twoCol: { flexDirection: 'row' as const, gap: 14 },
  colMain: { flex: 3 },
  colSide: { flex: 2 },

  /* spec table */
  specTable: { borderWidth: 0.75, borderColor: C.border, marginBottom: 12 },
  specRow: {
    flexDirection: 'row' as const,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    minHeight: 18,
  },
  specRowLast: { flexDirection: 'row' as const, minHeight: 18 },
  specLabel: {
    width: '38%',
    backgroundColor: C.tableBg,
    paddingVertical: 4,
    paddingHorizontal: 8,
    justifyContent: 'center' as const,
  },
  specLabelText: {
    fontSize: 7.5,
    color: C.mid,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  specValue: {
    width: '62%',
    paddingVertical: 4,
    paddingHorizontal: 8,
    justifyContent: 'center' as const,
  },
  specValueText: { fontSize: 8.5, color: C.black },

  /* pricing cards */
  pricingCard: {
    backgroundColor: C.accent,
    padding: 10,
    borderRadius: 2,
    marginBottom: 6,
  },
  pricingLabel: {
    fontSize: 6.5,
    color: C.accentLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  pricingValue: { fontSize: 14, fontWeight: 'bold', color: C.white },

  /* features */
  featuresBox: {
    backgroundColor: C.tableBg,
    padding: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: C.accent,
  },
  featureItem: { flexDirection: 'row' as const, marginBottom: 2 },
  featureCheck: { fontSize: 7.5, color: C.accent, marginRight: 5, fontWeight: 'bold' },
  featureText: { fontSize: 7.5, color: C.dark },

  /* map */
  mapImage: {
    width: '100%',
    height: 220,
    objectFit: 'cover' as const,
    borderWidth: 0.75,
    borderColor: C.border,
  },
  mapCaption: { fontSize: 6.5, color: C.light, textAlign: 'center' as const, marginTop: 3 },

  /* ── PAGE 3: HIGHLIGHTS ────────────────────── */
  highlightBullet: {
    flexDirection: 'row' as const,
    marginBottom: 5,
    paddingRight: 20,
  },
  bulletSquare: {
    width: 5,
    height: 5,
    backgroundColor: C.yellow,
    marginRight: 8,
    marginTop: 3,
  },
  bulletText: { flex: 1, fontSize: 8.5, color: C.dark, lineHeight: 1.45 },

  /* snapshot band */
  snapshotBand: {
    flexDirection: 'row' as const,
    backgroundColor: C.accent,
    marginVertical: 12,
  },
  snapshotCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center' as const,
    borderRightWidth: 0.5,
    borderRightColor: '#2a4f7a',
  },
  snapshotCellLast: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center' as const,
  },
  snapshotLabel: {
    fontSize: 6,
    color: C.accentLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  snapshotValue: { fontSize: 11, fontWeight: 'bold', color: C.white },

  /* photo strip */
  photoStrip: {
    flexDirection: 'row' as const,
    gap: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  photoStripItem: { flex: 1, height: 110, objectFit: 'cover' as const, borderWidth: 0.5, borderColor: C.border },

  /* confidential */
  confidentialBox: {
    backgroundColor: '#fef3c7',
    padding: 10,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: C.yellow,
  },
  confidentialTitle: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  confidentialText: { fontSize: 7.5, color: '#78350f', lineHeight: 1.4 },

  /* footer */
  footer: {
    position: 'absolute' as const,
    bottom: 14,
    left: 36,
    right: 36,
    borderTopWidth: 0.75,
    borderTopColor: C.border,
    paddingTop: 5,
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerLeft: { fontSize: 6.5, color: C.light },
  footerDisclaimer: {
    fontSize: 5,
    color: C.light,
    textAlign: 'right' as const,
    maxWidth: '65%',
    lineHeight: 1.3,
  },
});

// ── Helpers ─────────────────────────────────────────────────────
const fmt = (v: number | null | undefined) =>
  v != null ? new Intl.NumberFormat('en-CA').format(v) : null;

const fmtCurrency = (v: number | null | undefined) =>
  v != null
    ? new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2 }).format(v)
    : null;

const fmtRate = (v: number | null | undefined) =>
  v != null ? `$${v.toFixed(2)} PSF` : null;

const DISCLAIMER =
  'This disclaimer shall apply to Clearview Commercial Realty Inc. The information set out herein has not been independently verified and Clearview does not represent, warrant or guarantee the accuracy, correctness and completeness of the information. Any projections, opinions, assumptions or estimates used are for example only. The property may be withdrawn without notice.';

// ── Sub-components ──────────────────────────────────────────────
function SpecRow({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) {
  return (
    <View style={isLast ? s.specRowLast : s.specRow}>
      <View style={s.specLabel}>
        <Text style={s.specLabelText}>{label}</Text>
      </View>
      <View style={s.specValue}>
        <Text style={s.specValueText}>{value}</Text>
      </View>
    </View>
  );
}

function Header({ dealTypeLabel }: { dealTypeLabel: string }) {
  return (
    <View style={s.headerBar}>
      <Image src={clearviewLogo} style={s.logo} />
      <Text style={s.dealTypeBadge}>{dealTypeLabel}</Text>
    </View>
  );
}

function Footer({ address, city }: { address: string; city: string }) {
  return (
    <View style={s.footer}>
      <Text style={s.footerLeft}>{address}, {city}</Text>
      <Text style={s.footerDisclaimer}>{DISCLAIMER}</Text>
    </View>
  );
}

// ── Main component ──────────────────────────────────────────────
export function ListingBrochurePDF({
  listing,
  marketing,
  includeConfidential = false,
  staticMapUrl,
  additionalPhotos = [],
}: ListingBrochurePDFProps) {
  const dealTypeLabel =
    listing.deal_type === 'sale' || listing.deal_type === 'Sale'
      ? 'For Sale'
      : listing.deal_type === 'lease' || listing.deal_type === 'Lease'
        ? 'For Lease'
        : 'For Sale / Lease';

  const displayAddr = listing.display_address || listing.address;

  // ── Build specification rows ──────────────────────────────────
  const specs: { label: string; value: string }[] = [];
  if (listing.property_type) specs.push({ label: 'Property Type', value: listing.property_type });
  if (listing.zoning) specs.push({ label: 'Zoning', value: listing.zoning });
  if (listing.land_acres) specs.push({ label: 'Site Area', value: `${listing.land_acres} Acres` });
  if (listing.size_sf) specs.push({ label: 'Total Building Area', value: `±${fmt(listing.size_sf)} SF` });
  if (listing.warehouse_sf) specs.push({ label: 'Warehouse', value: `±${fmt(listing.warehouse_sf)} SF` });
  if (listing.office_sf) specs.push({ label: 'Office', value: `±${fmt(listing.office_sf)} SF` });
  if (listing.second_floor_office_sf) specs.push({ label: '2nd Floor Office', value: `±${fmt(listing.second_floor_office_sf)} SF` });
  if (listing.clear_height_ft) specs.push({ label: 'Ceiling Height', value: `${listing.clear_height_ft}'` });

  const loadingParts: string[] = [];
  if (listing.dock_doors) loadingParts.push(`${listing.dock_doors} x Dock`);
  if (listing.drive_in_doors) loadingParts.push(`${listing.drive_in_doors} x Drive-In`);
  if (loadingParts.length > 0) specs.push({ label: 'Loading', value: loadingParts.join(', ') });

  if (listing.drive_in_door_dimensions?.length) {
    const dims = listing.drive_in_door_dimensions.filter(Boolean).join(', ');
    if (dims) specs.push({ label: 'Drive-In Dimensions', value: dims });
  }

  if (listing.power) specs.push({ label: 'Power', value: listing.power });

  if (listing.has_sprinklers) {
    specs.push({ label: 'Sprinklers', value: listing.sprinklers_esfr ? 'ESFR' : 'Yes' });
  }

  if (listing.has_mua && listing.mua_units) {
    const cfmParts = listing.mua_cfm_ratings?.filter(Boolean);
    const muaValue = cfmParts && cfmParts.length > 0
      ? `${listing.mua_units} Unit${listing.mua_units > 1 ? 's' : ''} (${cfmParts.join(', ')} CFM)`
      : `${listing.mua_units} Unit${listing.mua_units > 1 ? 's' : ''}`;
    specs.push({ label: 'Make Up Air', value: muaValue });
  }

  if (listing.yard) specs.push({ label: 'Yard', value: listing.yard });

  // ── Building features ─────────────────────────────────────────
  const features: string[] = [];
  if (listing.has_heated) features.push('Heated');
  if (listing.has_air_conditioning) features.push('Air Conditioning');
  if (listing.has_led_lighting) features.push('LED Lighting');
  if (listing.has_rail_access) features.push('Rail Access');
  if (listing.additional_features) features.push(listing.additional_features);

  // ── Financial section ─────────────────────────────────────────
  const financials: { label: string; value: string }[] = [];
  if (listing.op_costs) financials.push({ label: 'Operating Costs', value: fmtRate(listing.op_costs)! });
  if (listing.cam) financials.push({ label: 'CAM', value: fmtRate(listing.cam)! });
  if (listing.taxes) financials.push({ label: 'Taxes', value: fmtRate(listing.taxes)! });
  if (listing.gross_rate) financials.push({ label: 'Gross Rate', value: fmtRate(listing.gross_rate)! });
  if (listing.estimated_annual_tax)
    financials.push({ label: 'Property Taxes', value: `${fmtCurrency(listing.estimated_annual_tax)} (Annual)` });

  const showPricing =
    (listing.asking_rent_psf && listing.deal_type !== 'sale' && listing.deal_type !== 'Sale') ||
    (listing.asking_sale_price && listing.deal_type !== 'lease' && listing.deal_type !== 'Lease');

  // ── Snapshot band data ────────────────────────────────────────
  const snapshots: { label: string; value: string }[] = [];
  if (listing.size_sf) snapshots.push({ label: 'Building', value: `${fmt(listing.size_sf)} SF` });
  if (listing.land_acres) snapshots.push({ label: 'Land', value: `${listing.land_acres} AC` });
  if (listing.clear_height_ft) snapshots.push({ label: 'Clear Height', value: `${listing.clear_height_ft}'` });
  if (listing.dock_doors) snapshots.push({ label: 'Dock Doors', value: `${listing.dock_doors}` });
  if (listing.drive_in_doors) snapshots.push({ label: 'Drive-In', value: `${listing.drive_in_doors}` });
  if (listing.asking_rent_psf && listing.deal_type !== 'sale' && listing.deal_type !== 'Sale')
    snapshots.push({ label: 'Asking Rent', value: fmtRate(listing.asking_rent_psf)! });
  if (listing.asking_sale_price && listing.deal_type !== 'lease' && listing.deal_type !== 'Lease')
    snapshots.push({ label: 'Asking Price', value: fmtCurrency(listing.asking_sale_price)! });

  // Take first secondary photo for the cover
  const secondaryPhoto = additionalPhotos.length > 0 ? additionalPhotos[0] : null;
  // Remaining photos for page 3 strip
  const stripPhotos = additionalPhotos.slice(1, 4);

  return (
    <Document>
      {/* ═══════════════ PAGE 1 – COVER + EXECUTIVE SUMMARY ═══════════════ */}
      <Page size="LETTER" style={s.page}>
        <Header dealTypeLabel={dealTypeLabel} />

        {listing.photo_url && <Image src={listing.photo_url} style={s.heroImage} />}

        <View style={s.coverBody}>
          <Text style={s.coverAddress}>{displayAddr}</Text>
          <Text style={s.coverSubline}>
            {listing.city}, Alberta | {listing.submarket}
          </Text>
          <View style={s.accentBar} />

          <Text style={s.coverHeadline}>{marketing.headline}</Text>

          <View style={s.coverTwoCol}>
            <View style={s.coverCol}>
              <Text style={s.coverDescription}>{marketing.description}</Text>
            </View>
            <View style={s.coverCol}>
              <Text style={s.coverDescription}>{marketing.tagline}</Text>
              {secondaryPhoto && (
                <Image src={secondaryPhoto.photo_url} style={s.coverSecondaryPhoto} />
              )}
            </View>
          </View>
        </View>

        <Footer address={displayAddr} city={listing.city} />
      </Page>

      {/* ═══════════════ PAGE 2 – PROPERTY SPECS & MAP ═══════════════ */}
      <Page size="LETTER" style={s.page}>
        <Header dealTypeLabel={dealTypeLabel} />

        <View style={s.pageInner}>
          <View style={s.twoCol}>
            {/* Left: Specs table */}
            <View style={s.colMain}>
              <Text style={s.sectionTitle}>Property Details</Text>
              <View style={s.specTable}>
                {specs.map((spec, idx) => (
                  <SpecRow key={idx} label={spec.label} value={spec.value} isLast={idx === specs.length - 1} />
                ))}
              </View>

              {features.length > 0 && (
                <View style={s.featuresBox}>
                  {features.map((f, i) => (
                    <View key={i} style={s.featureItem}>
                      <Text style={s.featureCheck}>✓</Text>
                      <Text style={s.featureText}>{f}</Text>
                    </View>
                  ))}
                </View>
              )}

              {financials.length > 0 && (
                <>
                  <Text style={s.sectionTitle}>Additional Costs</Text>
                  <View style={s.specTable}>
                    {financials.map((fin, idx) => (
                      <SpecRow key={idx} label={fin.label} value={fin.value} isLast={idx === financials.length - 1} />
                    ))}
                  </View>
                </>
              )}
            </View>

            {/* Right: Pricing + Map */}
            <View style={s.colSide}>
              {showPricing && (
                <>
                  <Text style={s.sectionTitle}>Pricing</Text>
                  {listing.asking_rent_psf && listing.deal_type !== 'sale' && listing.deal_type !== 'Sale' && (
                    <View style={s.pricingCard}>
                      <Text style={s.pricingLabel}>Asking Rent</Text>
                      <Text style={s.pricingValue}>{fmtRate(listing.asking_rent_psf)}</Text>
                    </View>
                  )}
                  {listing.asking_sale_price && listing.deal_type !== 'lease' && listing.deal_type !== 'Lease' && (
                    <View style={s.pricingCard}>
                      <Text style={s.pricingLabel}>Asking Price</Text>
                      <Text style={s.pricingValue}>{fmtCurrency(listing.asking_sale_price)}</Text>
                    </View>
                  )}
                </>
              )}

              {staticMapUrl && (
                <View style={{ marginTop: showPricing ? 10 : 0 }}>
                  <Text style={s.sectionTitle}>Location</Text>
                  <Image src={staticMapUrl} style={s.mapImage} />
                  <Text style={s.mapCaption}>{displayAddr}, {listing.city}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <Footer address={displayAddr} city={listing.city} />
      </Page>

      {/* ═══════════════ PAGE 3 – HIGHLIGHTS & SNAPSHOT ═══════════════ */}
      <Page size="LETTER" style={s.page}>
        <Header dealTypeLabel={dealTypeLabel} />

        <View style={s.pageInner}>
          {/* Snapshot band – key metrics at a glance */}
          {snapshots.length > 0 && (
            <View style={s.snapshotBand}>
              {snapshots.slice(0, 6).map((snap, i) => (
                <View key={i} style={i < snapshots.length - 1 ? s.snapshotCell : s.snapshotCellLast}>
                  <Text style={s.snapshotLabel}>{snap.label}</Text>
                  <Text style={s.snapshotValue}>{snap.value}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Highlights */}
          <Text style={s.sectionTitle}>Key Highlights</Text>
          <View style={s.coverTwoCol}>
            <View style={s.coverCol}>
              {marketing.highlights.filter((_, i) => i % 2 === 0).map((h, i) => (
                <View key={i} style={s.highlightBullet}>
                  <View style={s.bulletSquare} />
                  <Text style={s.bulletText}>{h}</Text>
                </View>
              ))}
            </View>
            <View style={s.coverCol}>
              {marketing.highlights.filter((_, i) => i % 2 === 1).map((h, i) => (
                <View key={i} style={s.highlightBullet}>
                  <View style={s.bulletSquare} />
                  <Text style={s.bulletText}>{h}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Photo strip – up to 3 additional photos */}
          {stripPhotos.length > 0 && (
            <View style={s.photoStrip}>
              {stripPhotos.map((photo, idx) => (
                <Image key={photo.id || idx} src={photo.photo_url} style={s.photoStripItem} />
              ))}
            </View>
          )}

          {/* Confidential broker notes */}
          {includeConfidential && (
            <View style={s.confidentialBox}>
              <Text style={s.confidentialTitle}>Confidential — Broker Notes</Text>
              <Text style={s.confidentialText}>{marketing.broker_pitch}</Text>
            </View>
          )}
        </View>

        <Footer address={displayAddr} city={listing.city} />
      </Page>
    </Document>
  );
}
