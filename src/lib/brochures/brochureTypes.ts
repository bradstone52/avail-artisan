/**
 * brochureTypes.ts
 *
 * All TypeScript interfaces for the brochure engine.
 * These are intentionally decoupled from the database row types so the
 * engine can be driven by any data source (internal listing, future external listing, etc.)
 *
 * ADOBE EXPRESS NOTE:
 * When you provide the visual reference, map the visual sections below to the
 * corresponding AE layers/frames.  Each section has a `show` flag so you can
 * toggle blocks to match whatever the AE template includes.
 */

// ─── Template registry ──────────────────────────────────────────────────────

/** All implemented template keys. Extend this union as you add variants. */
export type BrochureTemplateKey =
  | 'industrial-standard'   // ← implemented in Phase 1
  | 'industrial-lease'      // ← future
  | 'industrial-sale'       // ← future
  | 'industrial-both';      // ← future

// ─── Raw source data ─────────────────────────────────────────────────────────

/** Subset of InternalListing that the brochure engine cares about. */
export interface BrochureSourceListing {
  id: string;
  address: string;
  display_address?: string | null;
  city: string;
  submarket: string;
  deal_type: string;
  property_type?: string | null;
  zoning?: string | null;
  listing_number?: string | null;

  // Sizes
  size_sf?: number | null;
  warehouse_sf?: number | null;
  office_sf?: number | null;
  second_floor_office_sf?: number | null;
  land_acres?: number | null;

  // Specs
  clear_height_ft?: number | null;
  dock_doors?: number | null;
  drive_in_doors?: number | null;
  drive_in_door_dimensions?: (string | null)[] | null;
  loading_type?: string | null;
  power?: string | null;
  yard?: string | null;

  // Boolean features
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

  // Financials
  asking_rent_psf?: number | null;
  asking_sale_price?: number | null;
  op_costs?: number | null;
  cam?: number | null;
  taxes?: number | null;
  gross_rate?: number | null;
  estimated_annual_tax?: number | null;
  assessed_value?: number | null;

  // Location
  latitude?: number | null;
  longitude?: number | null;

  // Media
  photo_url?: string | null;

  // Copy (used as fallback if no AI content)
  description?: string | null;
  broker_remarks?: string | null;
}

/** AI-generated marketing copy (matches generate-listing-marketing edge function output). */
export interface BrochureMarketingContent {
  headline: string;
  tagline: string;
  /** Multi-paragraph property description */
  description: string;
  /** 5-8 one-liner bullets */
  highlights: string[];
  /** Confidential broker talking points */
  broker_pitch: string;
}

/** A single photo (hero or gallery). */
export interface BrochurePhoto {
  id: string;
  photo_url: string;       // may be a blob URL or CDN URL
  caption?: string | null;
  sort_order?: number | null;
}

// ─── Override surface ─────────────────────────────────────────────────────────
/**
 * Overrides are the broker's manual tweaks applied on top of auto-populated data.
 * They are persisted in localStorage (or optionally the DB) keyed by listing ID.
 *
 * PERSISTENCE NOTE (see section 10 of the spec):
 * We chose localStorage for Phase 1 to avoid a migration.
 * If overrides need to survive across devices or be team-shared, move them to a
 * dedicated `brochure_overrides` table:
 *   CREATE TABLE brochure_overrides (
 *     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     listing_id uuid REFERENCES internal_listings(id) ON DELETE CASCADE,
 *     template_key text NOT NULL DEFAULT 'industrial-standard',
 *     overrides jsonb NOT NULL DEFAULT '{}',
 *     created_at timestamptz DEFAULT now(),
 *     updated_at timestamptz DEFAULT now()
 *   );
 */
export interface BrochureOverrides {
  /** If set, overrides the AI-generated headline */
  headline?: string;
  /** If set, overrides the AI-generated tagline */
  tagline?: string;
  /** If set, overrides the AI-generated description */
  description?: string;
  /** Full replacement of the highlights array (allows reorder + custom items) */
  highlights?: string[];
  /** Custom disclaimer text (replaces the default) */
  disclaimer?: string;
  /** Which template to use */
  templateKey?: BrochureTemplateKey;
  /** ID of the hero photo (from BrochurePhoto[].id). Null = use listing.photo_url */
  heroPhotoId?: string | null;
  /** IDs of gallery photos to include, in order */
  galleryPhotoIds?: string[];
  /** Fine-grained section visibility */
  visibility?: BrochureSectionVisibility;
}

/** Per-section show/hide toggles. All default to `true`. */
export interface BrochureSectionVisibility {
  cover?: boolean;
  tagline?: boolean;
  description?: boolean;
  highlights?: boolean;
  specs?: boolean;
  pricing?: boolean;
  map?: boolean;
  gallery?: boolean;
  brokerNotes?: boolean;   // confidential, off by default in public prints
  footer?: boolean;
}

// ─── Normalized brochure data object ─────────────────────────────────────────
/**
 * `BrochureData` is the single normalised representation of everything
 * a template needs to render.  It is produced by `buildBrochureData()`.
 *
 * Templates read ONLY from this object — they must not query listing data directly.
 */
export interface BrochureData {
  /** Which template will render this data */
  templateKey: BrochureTemplateKey;

  // ── Identity ──
  listingId: string;
  listingNumber: string | null;
  dealType: string;
  dealTypeLabel: string;   // e.g. "For Lease"
  propertyType: string | null;

  // ── Cover / address ──
  cover: {
    displayAddress: string;
    city: string;
    submarket: string;
    heroPhotoUrl: string | null;
    secondaryPhotoUrl: string | null;   // first gallery photo, shown on cover col
  };

  // ── Copy ──
  copy: {
    headline: string;
    tagline: string;
    description: string;
    highlights: string[];
  };

  // ── Spec table rows (label/value pairs, already formatted) ──
  specs: BrochureSpecRow[];

  // ── Boolean feature bullets ──
  features: string[];

  // ── Financial table rows ──
  financials: BrochureSpecRow[];

  // ── Snapshot band (key metrics bar) ──
  snapshots: BrochureSpecRow[];

  // ── Pricing ──
  pricing: {
    show: boolean;
    rent: string | null;    // formatted, e.g. "$14.50 PSF"
    price: string | null;   // formatted, e.g. "$2,400,000"
  };

  // ── Location ──
  location: {
    staticMapUrl: string | null;    // base64 data URL for react-pdf
    mapCaption: string;
  };

  // ── Gallery ──
  gallery: BrochurePhoto[];         // photos for strip (max 3)

  // ── Broker block ──
  broker: {
    notes: string | null;
    includeNotes: boolean;
  };

  // ── Disclaimer ──
  disclaimer: string;

  // ── Visibility config ──
  visibility: Required<BrochureSectionVisibility>;
}

/** A key/value row used in spec tables, financial tables, and snapshot bands. */
export interface BrochureSpecRow {
  label: string;
  value: string;
}
