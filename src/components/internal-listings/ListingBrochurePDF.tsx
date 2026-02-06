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
  // Extended building features
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
  accent: '#1e3a5f',   // dark navy
  accentLight: '#e8eef5',
  highlight: '#2563EB', // blue for pricing
};

// ── Styles ──────────────────────────────────────────────────────
const s = StyleSheet.create({
  /* ---------- shared ---------- */
  page: {
    padding: 0,
    fontSize: 9,
    fontFamily: 'Helvetica',
    backgroundColor: C.white,
  },
  pageInner: {
    paddingHorizontal: 36,
    paddingTop: 10,
  },

  /* ---------- header strip ---------- */
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingVertical: 12,
    backgroundColor: C.white,
  },
  logo: {
    width: 130,
    height: 28,
    objectFit: 'contain',
  },
  dealTypeBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    color: C.accent,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },

  /* ---------- cover page ---------- */
  heroImage: {
    width: '100%',
    height: 260,
    objectFit: 'cover',
  },
  coverContent: {
    paddingHorizontal: 36,
    paddingTop: 16,
  },
  coverHeadline: {
    fontSize: 22,
    fontWeight: 'bold',
    color: C.black,
    lineHeight: 1.2,
    marginBottom: 4,
  },
  coverAddress: {
    fontSize: 12,
    color: C.dark,
    marginBottom: 2,
  },
  coverCity: {
    fontSize: 10,
    color: C.mid,
    marginBottom: 12,
  },
  coverTagline: {
    fontSize: 10,
    color: C.accent,
    fontWeight: 'bold',
    lineHeight: 1.3,
    marginBottom: 12,
  },
  coverHighlights: {
    marginTop: 4,
  },
  coverBullet: {
    flexDirection: 'row',
    marginBottom: 5,
    paddingRight: 36,
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.accent,
    marginRight: 8,
    marginTop: 4,
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
    color: C.dark,
    lineHeight: 1.4,
  },
  accentLine: {
    width: 60,
    height: 3,
    backgroundColor: C.accent,
    marginBottom: 10,
  },

  /* ---------- details page ---------- */
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: C.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1.5,
    borderBottomColor: C.accent,
  },
  description: {
    fontSize: 9,
    lineHeight: 1.5,
    color: C.dark,
    textAlign: 'justify',
    marginBottom: 16,
  },

  /* spec table */
  specTable: {
    borderWidth: 0.75,
    borderColor: C.border,
    marginBottom: 16,
  },
  specRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    minHeight: 20,
  },
  specRowLast: {
    flexDirection: 'row',
    minHeight: 20,
  },
  specLabel: {
    width: '35%',
    backgroundColor: C.tableBg,
    paddingVertical: 5,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  specLabelText: {
    fontSize: 8,
    color: C.mid,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  specValue: {
    width: '65%',
    paddingVertical: 5,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  specValueText: {
    fontSize: 9,
    color: C.black,
  },

  /* pricing */
  pricingRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  pricingCard: {
    flex: 1,
    backgroundColor: C.accent,
    padding: 12,
    borderRadius: 2,
  },
  pricingLabel: {
    fontSize: 7,
    color: C.accentLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  pricingValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: C.white,
  },

  /* features */
  featuresBox: {
    backgroundColor: C.tableBg,
    padding: 10,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: C.accent,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  featureCheck: {
    fontSize: 8,
    color: C.accent,
    marginRight: 6,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 8,
    color: C.dark,
  },

  /* two-column layout */
  twoCol: {
    flexDirection: 'row',
    gap: 16,
  },
  colMain: {
    flex: 3,
  },
  colSide: {
    flex: 2,
  },

  /* confidential */
  confidentialBox: {
    backgroundColor: '#fef3c7',
    padding: 10,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#d97706',
  },
  confidentialTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  confidentialText: {
    fontSize: 8,
    color: '#78350f',
    lineHeight: 1.4,
  },

  /* map */
  mapSection: {
    marginTop: 12,
  },
  mapImage: {
    width: '100%',
    height: 300,
    objectFit: 'cover',
    borderWidth: 0.75,
    borderColor: C.border,
  },
  mapCaption: {
    fontSize: 7,
    color: C.light,
    textAlign: 'center',
    marginTop: 4,
  },

  /* footer */
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 36,
    right: 36,
    borderTopWidth: 0.75,
    borderTopColor: C.border,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerLeft: {
    fontSize: 7,
    color: C.light,
  },
  footerDisclaimer: {
    fontSize: 5.5,
    color: C.light,
    textAlign: 'right',
    maxWidth: '65%',
    lineHeight: 1.3,
  },

  /* photo pages */
  photosTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: C.black,
    marginBottom: 12,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  photoItem: {
    width: '48%',
    marginBottom: 12,
  },
  photo: {
    width: '100%',
    height: 180,
    objectFit: 'cover',
    borderWidth: 0.5,
    borderColor: C.border,
  },
  photoCaption: {
    fontSize: 7,
    color: C.mid,
    marginTop: 3,
    textAlign: 'center',
  },
});

// ── Helpers ─────────────────────────────────────────────────────
const fmt = (v: number | null | undefined) =>
  v != null ? new Intl.NumberFormat('en-CA').format(v) : null;

const fmtCurrency = (v: number | null | undefined) =>
  v != null
    ? new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
        minimumFractionDigits: 2,
      }).format(v)
    : null;

const fmtRate = (v: number | null | undefined) =>
  v != null ? `$${v.toFixed(2)} PSF` : null;

const DISCLAIMER =
  'This disclaimer shall apply to Clearview Commercial Realty Inc. The information set out herein has not been independently verified and Clearview does not represent, warrant or guarantee the accuracy, correctness and completeness of the information. Any projections, opinions, assumptions or estimates used are for example only. The property may be withdrawn without notice.';

// ── Sub-components ──────────────────────────────────────────────
function SpecRow({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
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
      <Text style={s.footerLeft}>
        {address}, {city}
      </Text>
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
      ? 'Industrial  |  For Sale'
      : listing.deal_type === 'lease' || listing.deal_type === 'Lease'
        ? 'Industrial  |  For Lease'
        : 'Industrial  |  For Sale / Lease';

  const displayAddr = listing.display_address || listing.address;

  // ── Build specification rows ──────────────────────────────────
  const specs: { label: string; value: string }[] = [];

  if (listing.property_type) specs.push({ label: 'Property Type', value: listing.property_type });
  if (listing.zoning) specs.push({ label: 'Zoning', value: listing.zoning });
  if (listing.land_acres) specs.push({ label: 'Site Area', value: `${listing.land_acres} Acres` });
  if (listing.size_sf) specs.push({ label: 'Total Building Area', value: `±${fmt(listing.size_sf)} SF` });
  if (listing.warehouse_sf) specs.push({ label: 'Warehouse', value: `±${fmt(listing.warehouse_sf)} SF` });
  if (listing.office_sf) specs.push({ label: 'Office', value: `±${fmt(listing.office_sf)} SF` });
  if (listing.second_floor_office_sf)
    specs.push({ label: 'Second Floor Office', value: `±${fmt(listing.second_floor_office_sf)} SF` });
  if (listing.clear_height_ft)
    specs.push({ label: 'Ceiling Height', value: `${listing.clear_height_ft}'` });

  // Loading – combine dock + drive-in
  const loadingParts: string[] = [];
  if (listing.dock_doors) loadingParts.push(`${listing.dock_doors} x Dock`);
  if (listing.drive_in_doors) loadingParts.push(`${listing.drive_in_doors} x Drive-In`);
  if (loadingParts.length > 0) specs.push({ label: 'Loading', value: loadingParts.join(', ') });

  // Drive-in door dimensions
  if (listing.drive_in_door_dimensions?.length) {
    const dims = listing.drive_in_door_dimensions.filter(Boolean).join(', ');
    if (dims) specs.push({ label: 'Drive-In Dimensions', value: dims });
  }

  if (listing.power) specs.push({ label: 'Power', value: listing.power });

  // Sprinklers
  if (listing.has_sprinklers) {
    specs.push({
      label: 'Sprinklers',
      value: listing.sprinklers_esfr ? 'ESFR' : 'Yes',
    });
  }

  // MUA
  if (listing.has_mua && listing.mua_units) {
    const cfmParts = listing.mua_cfm_ratings?.filter(Boolean);
    const muaValue =
      cfmParts && cfmParts.length > 0
        ? `${listing.mua_units} Unit${listing.mua_units > 1 ? 's' : ''} (${cfmParts.join(', ')} CFM)`
        : `${listing.mua_units} Unit${listing.mua_units > 1 ? 's' : ''}`;
    specs.push({ label: 'Make Up Air', value: muaValue });
  }

  if (listing.yard) specs.push({ label: 'Yard', value: listing.yard });

  // ── Building features list ────────────────────────────────────
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

  return (
    <Document>
      {/* ═══════════════════════ PAGE 1 – COVER ═══════════════════════ */}
      <Page size="LETTER" style={s.page}>
        <Header dealTypeLabel={dealTypeLabel} />

        {listing.photo_url && <Image src={listing.photo_url} style={s.heroImage} />}

        <View style={s.coverContent}>
          <View style={s.accentLine} />
          <Text style={s.coverHeadline}>{marketing.headline}</Text>
          <Text style={s.coverAddress}>{displayAddr}</Text>
          <Text style={s.coverCity}>
            {listing.city}, Alberta | {listing.submarket}
          </Text>
          <Text style={s.coverTagline}>{marketing.tagline}</Text>

          {/* Quick highlights on cover */}
          <View style={s.coverHighlights}>
            {marketing.highlights.slice(0, 5).map((h, i) => (
              <View key={i} style={s.coverBullet}>
                <View style={s.bulletDot} />
                <Text style={s.bulletText}>{h}</Text>
              </View>
            ))}
          </View>
        </View>

        <Footer address={displayAddr} city={listing.city} />
      </Page>

      {/* ═══════════════════════ PAGE 2 – DETAILS ═══════════════════════ */}
      <Page size="LETTER" style={s.page}>
        <Header dealTypeLabel={dealTypeLabel} />

        <View style={s.pageInner}>
          {/* The Opportunity */}
          <Text style={s.sectionTitle}>The Opportunity</Text>
          <Text style={s.description}>{marketing.description}</Text>

          <View style={s.twoCol}>
            {/* Left: Specifications */}
            <View style={s.colMain}>
              <Text style={s.sectionTitle}>Property Details</Text>
              <View style={s.specTable}>
                {specs.map((spec, idx) => (
                  <SpecRow
                    key={idx}
                    label={spec.label}
                    value={spec.value}
                    isLast={idx === specs.length - 1}
                  />
                ))}
              </View>

              {/* Building Features */}
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
            </View>

            {/* Right: Pricing & Financials */}
            <View style={s.colSide}>
              {showPricing && (
                <>
                  <Text style={s.sectionTitle}>Pricing</Text>
                  {listing.asking_rent_psf &&
                    listing.deal_type !== 'sale' &&
                    listing.deal_type !== 'Sale' && (
                      <View style={s.pricingCard}>
                        <Text style={s.pricingLabel}>Asking Rent</Text>
                        <Text style={s.pricingValue}>{fmtRate(listing.asking_rent_psf)}</Text>
                      </View>
                    )}
                  {listing.asking_sale_price &&
                    listing.deal_type !== 'lease' &&
                    listing.deal_type !== 'Lease' && (
                      <View style={[s.pricingCard, { marginTop: 6 }]}>
                        <Text style={s.pricingLabel}>Asking Price</Text>
                        <Text style={s.pricingValue}>
                          {fmtCurrency(listing.asking_sale_price)}
                        </Text>
                      </View>
                    )}
                </>
              )}

              {financials.length > 0 && (
                <View style={{ marginTop: showPricing ? 14 : 0 }}>
                  <Text style={s.sectionTitle}>Additional Costs</Text>
                  <View style={s.specTable}>
                    {financials.map((fin, idx) => (
                      <SpecRow
                        key={idx}
                        label={fin.label}
                        value={fin.value}
                        isLast={idx === financials.length - 1}
                      />
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>

          {includeConfidential && (
            <View style={s.confidentialBox}>
              <Text style={s.confidentialTitle}>Confidential — Broker Notes</Text>
              <Text style={s.confidentialText}>{marketing.broker_pitch}</Text>
            </View>
          )}
        </View>

        <Footer address={displayAddr} city={listing.city} />
      </Page>

      {/* ═══════════════════════ PAGE 3 – MAP & HIGHLIGHTS ═══════════════════════ */}
      {(staticMapUrl || marketing.highlights.length > 5) && (
        <Page size="LETTER" style={s.page}>
          <Header dealTypeLabel={dealTypeLabel} />

          <View style={s.pageInner}>
            {/* Remaining highlights if more than 5 */}
            {marketing.highlights.length > 5 && (
              <>
                <Text style={s.sectionTitle}>Additional Highlights</Text>
                <View style={{ marginBottom: 16 }}>
                  {marketing.highlights.slice(5).map((h, i) => (
                    <View key={i} style={s.coverBullet}>
                      <View style={s.bulletDot} />
                      <Text style={s.bulletText}>{h}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {staticMapUrl && (
              <View style={s.mapSection}>
                <Text style={s.sectionTitle}>Location</Text>
                <Image src={staticMapUrl} style={s.mapImage} />
                <Text style={s.mapCaption}>
                  {displayAddr}, {listing.city}, Alberta
                </Text>
              </View>
            )}
          </View>

          <Footer address={displayAddr} city={listing.city} />
        </Page>
      )}

      {/* ═══════════════════════ PHOTO PAGES ═══════════════════════ */}
      {additionalPhotos.length > 0 && (
        <Page size="LETTER" style={s.page}>
          <Header dealTypeLabel={dealTypeLabel} />
          <View style={s.pageInner}>
            <Text style={s.photosTitle}>Property Photos</Text>
            <View style={s.photoGrid}>
              {additionalPhotos.slice(0, 4).map((photo, idx) => (
                <View key={photo.id || idx} style={s.photoItem}>
                  <Image src={photo.photo_url} style={s.photo} />
                  {photo.caption && <Text style={s.photoCaption}>{photo.caption}</Text>}
                </View>
              ))}
            </View>
          </View>
          <Footer address={displayAddr} city={listing.city} />
        </Page>
      )}

      {additionalPhotos.length > 4 && (
        <Page size="LETTER" style={s.page}>
          <Header dealTypeLabel={dealTypeLabel} />
          <View style={s.pageInner}>
            <Text style={s.photosTitle}>Property Photos (Continued)</Text>
            <View style={s.photoGrid}>
              {additionalPhotos.slice(4, 8).map((photo, idx) => (
                <View key={photo.id || idx} style={s.photoItem}>
                  <Image src={photo.photo_url} style={s.photo} />
                  {photo.caption && <Text style={s.photoCaption}>{photo.caption}</Text>}
                </View>
              ))}
            </View>
          </View>
          <Footer address={displayAddr} city={listing.city} />
        </Page>
      )}
    </Document>
  );
}
