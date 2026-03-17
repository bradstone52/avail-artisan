/**
 * buildBrochureData.ts
 *
 * Pure function: takes raw inputs and returns a normalized BrochureData object.
 * Templates only consume BrochureData — they never access raw listing fields.
 *
 * This is the single source of truth for:
 *  - label formatting  (e.g. "±24,000 SF")
 *  - deal type label  (e.g. "For Lease")
 *  - snapshot band selection
 *  - section visibility defaults
 *
 * Keep this file free of side-effects, async calls, and React imports.
 */

import type {
  BrochureData,
  BrochureMarketingContent,
  BrochureOverrides,
  BrochurePhoto,
  BrochureSourceListing,
  BrochureSpecRow,
  BrochureSectionVisibility,
  BrochureTemplateKey,
} from './brochureTypes';

// ─── Formatters ──────────────────────────────────────────────────────────────

const fmt = (v: number | null | undefined): string | null =>
  v != null ? new Intl.NumberFormat('en-CA').format(v) : null;

const fmtCurrency = (v: number | null | undefined): string | null =>
  v != null
    ? new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(v)
    : null;

const fmtRate = (v: number | null | undefined): string | null =>
  v != null ? `$${v.toFixed(2)} PSF` : null;

// ─── Deal type label ──────────────────────────────────────────────────────────

function dealTypeLabel(dealType: string): string {
  const d = dealType.toLowerCase();
  if (d === 'sale') return 'For Sale';
  if (d === 'lease') return 'For Lease';
  return 'For Sale / Lease';
}

// ─── Section visibility defaults ─────────────────────────────────────────────

const DEFAULT_VISIBILITY: Required<BrochureSectionVisibility> = {
  cover: true,
  tagline: true,
  description: true,
  highlights: true,
  specs: true,
  pricing: true,
  map: true,
  gallery: true,
  brokerNotes: false,   // off by default — must be explicitly enabled
  footer: true,
};

function mergeVisibility(
  overrides?: BrochureSectionVisibility
): Required<BrochureSectionVisibility> {
  if (!overrides) return DEFAULT_VISIBILITY;
  return { ...DEFAULT_VISIBILITY, ...overrides };
}

// ─── Spec table builder ───────────────────────────────────────────────────────

function buildSpecRows(listing: BrochureSourceListing): BrochureSpecRow[] {
  const rows: BrochureSpecRow[] = [];

  if (listing.property_type) rows.push({ label: 'Property Type', value: listing.property_type });
  if (listing.zoning)        rows.push({ label: 'Zoning',         value: listing.zoning });
  if (listing.land_acres)    rows.push({ label: 'Site Area',       value: `${listing.land_acres} Acres` });

  const totalSf = fmt(listing.size_sf);
  if (totalSf) rows.push({ label: 'Total Building Area', value: `±${totalSf} SF` });

  const warehouseSf = fmt(listing.warehouse_sf);
  if (warehouseSf) rows.push({ label: 'Warehouse', value: `±${warehouseSf} SF` });

  const officeSf = fmt(listing.office_sf);
  if (officeSf) rows.push({ label: 'Office', value: `±${officeSf} SF` });

  const secondFloorSf = fmt(listing.second_floor_office_sf);
  if (secondFloorSf) rows.push({ label: '2nd Floor Office', value: `±${secondFloorSf} SF` });

  if (listing.clear_height_ft)
    rows.push({ label: 'Ceiling Height', value: `${listing.clear_height_ft}'` });

  const loadingParts: string[] = [];
  if (listing.dock_doors)     loadingParts.push(`${listing.dock_doors} × Dock`);
  if (listing.drive_in_doors) loadingParts.push(`${listing.drive_in_doors} × Drive-In`);
  if (loadingParts.length)    rows.push({ label: 'Loading', value: loadingParts.join(', ') });

  if (listing.drive_in_door_dimensions?.length) {
    const dims = listing.drive_in_door_dimensions.filter(Boolean).join(', ');
    if (dims) rows.push({ label: 'Drive-In Dimensions', value: dims });
  }

  if (listing.power) rows.push({ label: 'Power', value: listing.power });

  if (listing.has_sprinklers)
    rows.push({ label: 'Sprinklers', value: listing.sprinklers_esfr ? 'ESFR' : 'Yes' });

  if (listing.has_mua && listing.mua_units) {
    const cfm = listing.mua_cfm_ratings?.filter(Boolean) ?? [];
    const muaVal =
      cfm.length > 0
        ? `${listing.mua_units} Unit${listing.mua_units > 1 ? 's' : ''} (${cfm.join(', ')} CFM)`
        : `${listing.mua_units} Unit${listing.mua_units > 1 ? 's' : ''}`;
    rows.push({ label: 'Make Up Air', value: muaVal });
  }

  if (listing.yard) rows.push({ label: 'Yard', value: listing.yard });

  return rows;
}

// ─── Boolean feature bullets ──────────────────────────────────────────────────

function buildFeatures(listing: BrochureSourceListing): string[] {
  const feats: string[] = [];
  if (listing.has_heated)          feats.push('Heated');
  if (listing.has_air_conditioning) feats.push('Air Conditioning');
  if (listing.has_led_lighting)    feats.push('LED Lighting');
  if (listing.has_rail_access)     feats.push('Rail Access');
  if (listing.additional_features) feats.push(listing.additional_features);
  return feats;
}

// ─── Financial rows ───────────────────────────────────────────────────────────

function buildFinancialRows(listing: BrochureSourceListing): BrochureSpecRow[] {
  const rows: BrochureSpecRow[] = [];
  const opCosts = fmtRate(listing.op_costs);
  const cam     = fmtRate(listing.cam);
  const taxes   = fmtRate(listing.taxes);
  const gross   = fmtRate(listing.gross_rate);
  const annTax  = fmtCurrency(listing.estimated_annual_tax);

  if (opCosts) rows.push({ label: 'Operating Costs',  value: opCosts });
  if (cam)     rows.push({ label: 'CAM',               value: cam });
  if (taxes)   rows.push({ label: 'Taxes',             value: taxes });
  if (gross)   rows.push({ label: 'Gross Rate',        value: gross });
  if (annTax)  rows.push({ label: 'Property Taxes',    value: `${annTax} (Annual)` });
  return rows;
}

// ─── Snapshot band ────────────────────────────────────────────────────────────

function buildSnapshots(
  listing: BrochureSourceListing,
  pricing: BrochureData['pricing']
): BrochureSpecRow[] {
  const snaps: BrochureSpecRow[] = [];
  const sf = fmt(listing.size_sf);
  if (sf) snaps.push({ label: 'Building',     value: `${sf} SF` });
  if (listing.land_acres)    snaps.push({ label: 'Land',        value: `${listing.land_acres} AC` });
  if (listing.clear_height_ft) snaps.push({ label: 'Clear Height', value: `${listing.clear_height_ft}'` });
  if (listing.dock_doors)    snaps.push({ label: 'Dock Doors',  value: `${listing.dock_doors}` });
  if (listing.drive_in_doors) snaps.push({ label: 'Drive-In',   value: `${listing.drive_in_doors}` });
  if (pricing.rent)  snaps.push({ label: 'Asking Rent',  value: pricing.rent });
  if (pricing.price) snaps.push({ label: 'Asking Price', value: pricing.price });
  return snaps.slice(0, 6); // snapshot band shows max 6 cells
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

function buildPricing(
  listing: BrochureSourceListing
): BrochureData['pricing'] {
  const d = listing.deal_type?.toLowerCase();
  const showRent  = !!(listing.asking_rent_psf  && d !== 'sale');
  const showPrice = !!(listing.asking_sale_price && d !== 'lease');

  return {
    show:  showRent || showPrice,
    rent:  showRent  ? fmtRate(listing.asking_rent_psf)        : null,
    price: showPrice ? fmtCurrency(listing.asking_sale_price)  : null,
  };
}

// ─── Default disclaimer ───────────────────────────────────────────────────────

const DEFAULT_DISCLAIMER =
  'This disclaimer shall apply to Clearview Commercial Realty Inc. The information set out herein has not been ' +
  'independently verified and Clearview does not represent, warrant or guarantee the accuracy, correctness and ' +
  'completeness of the information. Any projections, opinions, assumptions or estimates used are for example only. ' +
  'The property may be withdrawn without notice.';

// ─── Main builder ─────────────────────────────────────────────────────────────

export interface BuildBrochureDataInput {
  listing: BrochureSourceListing;
  marketing: BrochureMarketingContent;
  /** Already base64-encoded for react-pdf, or null */
  staticMapBase64: string | null;
  /** Photos from internal_listing_photos table, pre-sorted */
  photos: BrochurePhoto[];
  overrides?: BrochureOverrides;
  includeConfidential?: boolean;
}

/**
 * Pure transform: raw inputs → normalized BrochureData.
 * Templates call this once and render from the result.
 */
export function buildBrochureData(input: BuildBrochureDataInput): BrochureData {
  const { listing, marketing, staticMapBase64, photos, overrides = {}, includeConfidential = false } = input;

  const templateKey: BrochureTemplateKey = overrides.templateKey ?? 'industrial-standard';
  const visibility = mergeVisibility(overrides.visibility);

  // Resolve hero photo
  let heroPhotoUrl: string | null = listing.photo_url ?? null;
  if (overrides.heroPhotoId) {
    const hero = photos.find(p => p.id === overrides.heroPhotoId);
    if (hero) heroPhotoUrl = hero.photo_url;
  }

  // Resolve gallery photos (all photos except the hero)
  let galleryPhotos: BrochurePhoto[];
  if (overrides.galleryPhotoIds?.length) {
    galleryPhotos = overrides.galleryPhotoIds
      .map(id => photos.find(p => p.id === id))
      .filter((p): p is BrochurePhoto => !!p);
  } else {
    galleryPhotos = photos.slice(0, 4);  // default: up to 4
  }

  const secondaryPhotoUrl = galleryPhotos[0]?.photo_url ?? null;
  const stripPhotos = galleryPhotos.slice(1, 4);  // up to 3 for the photo strip

  const pricing   = buildPricing(listing);
  const snapshots = buildSnapshots(listing, pricing);

  return {
    templateKey,
    listingId:      listing.id,
    listingNumber:  listing.listing_number ?? null,
    dealType:       listing.deal_type,
    dealTypeLabel:  dealTypeLabel(listing.deal_type),
    propertyType:   listing.property_type ?? null,

    cover: {
      displayAddress:    listing.display_address || listing.address,
      city:              listing.city,
      submarket:         listing.submarket,
      heroPhotoUrl,
      secondaryPhotoUrl,
    },

    copy: {
      headline:    overrides.headline    ?? marketing.headline,
      tagline:     overrides.tagline     ?? marketing.tagline,
      description: overrides.description ?? marketing.description,
      highlights:  overrides.highlights  ?? marketing.highlights,
    },

    specs:      buildSpecRows(listing),
    features:   buildFeatures(listing),
    financials: buildFinancialRows(listing),
    snapshots,
    pricing,

    location: {
      staticMapUrl: staticMapBase64,
      mapCaption: `${listing.display_address || listing.address}, ${listing.city}`,
    },

    gallery: stripPhotos,

    broker: {
      notes:        marketing.broker_pitch,
      includeNotes: includeConfidential,
    },

    disclaimer: overrides.disclaimer ?? DEFAULT_DISCLAIMER,
    visibility,
  };
}
