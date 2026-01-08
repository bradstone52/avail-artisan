// Core application types

export interface Listing {
  id: string;
  listing_id: string;
  property_name: string | null;
  address: string;
  city: string;
  submarket: string;
  size_sf: number;
  clear_height_ft: number | null;
  dock_doors: number;
  drive_in_doors: number;
  yard: 'Yes' | 'No' | 'Unknown';
  availability_date: string | null;
  asking_rate_psf: string | null;
  status: 'Active' | 'Leased' | 'Removed' | 'OnHold';
  include_in_issue: boolean;
  landlord: string | null;
  broker_source: string | null;
  notes_public: string | null;
  internal_note: string | null;
  link: string | null;
  photo_url: string | null;
  last_verified_date: string | null;
  power_amps: string | null;
  sprinkler: string | null;
  office_percent: string | null;
  cross_dock: 'Yes' | 'No' | 'Unknown';
  trailer_parking: 'Yes' | 'No' | 'Unknown';
  created_at: string;
  updated_at: string;
}

export interface Issue {
  id: string;
  user_id: string;
  title: string;
  market: string;
  size_threshold: number;
  sort_order: string;
  brokerage_name: string | null;
  logo_url: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  pdf_url: string | null;
  is_public: boolean;
  total_listings: number;
  new_count: number;
  changed_count: number;
  removed_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IssueListing {
  id: string;
  issue_id: string;
  listing_id: string;
  change_status: 'new' | 'changed' | 'unchanged' | null;
  executive_note: string | null;
  sort_order: number;
  listing?: Listing;
}

export interface SheetConnection {
  id: string;
  user_id: string;
  sheet_url: string;
  sheet_name: string;
  tab_name: string;
  connection_type: 'csv' | 'oauth';
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IssueSettings {
  title: string;
  market: string;
  sizeThreshold: number;
  sortOrder: 'size_desc' | 'size_asc' | 'availability_asc' | 'availability_desc';
  brokerageName: string;
  logoUrl: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
}

export interface ListingFilter {
  status?: string[];
  submarket?: string[];
  sizeMin?: number;
  sizeMax?: number;
  clearHeightMin?: number;
  dockDoorsMin?: number;
  includeInIssue?: boolean;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ParsedListing {
  data: Partial<Listing>;
  errors: ValidationError[];
  isValid: boolean;
}

// Sheet column mapping
export const REQUIRED_COLUMNS = [
  'ListingID',
  'PropertyName',
  'Address',
  'City',
  'Submarket',
  'SizeSF',
  'ClearHeightFt',
  'DockDoors',
  'DriveInDoors',
  'Yard',
  'AvailabilityDate',
  'AskingRatePSF',
  'Status',
  'IncludeInIssue',
] as const;

export const OPTIONAL_COLUMNS = [
  'Landlord',
  'BrokerSource',
  'NotesPublic',
  'InternalNote',
  'Link',
  'PhotoURL',
  'LastVerifiedDate',
  'PowerAmps',
  'Sprinkler',
  'OfficePercent',
  'CrossDock',
  'TrailerParking',
] as const;
