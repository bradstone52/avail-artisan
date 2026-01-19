// Field mapping configuration: spreadsheet header -> database column
// Header names are normalized (lowercase, trimmed) for matching

export interface FieldMapping {
  header: string;        // Exact header name from spreadsheet
  dbColumn: string;      // Database column name
  type: 'string' | 'number' | 'date';
  required?: boolean;
}

export const FIELD_MAPPINGS: FieldMapping[] = [
  // Identity - ONLY these two are truly required
  { header: 'ListingID', dbColumn: 'listing_id', type: 'string', required: true },
  { header: 'Address', dbColumn: 'address', type: 'string', required: true },
  
  // Core - these are mapped but NOT required (we provide defaults)
  { header: 'Municipality', dbColumn: 'city', type: 'string' },
  { header: 'Status', dbColumn: 'status', type: 'string' },
  { header: 'Submarket', dbColumn: 'submarket', type: 'string' },
  { header: 'Listing Type', dbColumn: 'listing_type', type: 'string' },
  { header: 'Broker', dbColumn: 'broker_source', type: 'string' },
  
  // Filter column - maps to include_in_issue
  { header: 'Distribution Warehouse?', dbColumn: 'include_in_issue', type: 'string' },
  
  // Specs
  { header: 'Total SF', dbColumn: 'size_sf', type: 'number' },
  { header: 'Warehouse SF', dbColumn: 'warehouse_sf', type: 'number' },
  { header: 'Office SF', dbColumn: 'office_sf', type: 'number' },
  { header: 'Ceiling Ht.', dbColumn: 'clear_height_ft', type: 'number' },
  { header: 'Dock Doors', dbColumn: 'dock_doors', type: 'number' },
  { header: 'Drive-in Doors', dbColumn: 'drive_in_doors', type: 'number' },
  { header: 'Power (Amps)', dbColumn: 'power_amps', type: 'string' },
  { header: 'Voltage', dbColumn: 'voltage', type: 'string' },
  { header: 'Yard Area', dbColumn: 'yard_area', type: 'string' },
  { header: 'Sprinklered', dbColumn: 'sprinkler', type: 'string' },
  { header: 'Cranes', dbColumn: 'cranes', type: 'string' },
  { header: 'Crane Tons', dbColumn: 'crane_tons', type: 'string' },
  { header: 'Building Depth', dbColumn: 'building_depth', type: 'string' },
  { header: 'Land Acres', dbColumn: 'land_acres', type: 'string' },
  { header: 'Zoning', dbColumn: 'zoning', type: 'string' },
  { header: 'MUA', dbColumn: 'mua', type: 'string' },
  
  // Commercial
  { header: 'Available', dbColumn: 'availability_date', type: 'string' },
  { header: 'Net Rate', dbColumn: 'asking_rate_psf', type: 'string' },
  { header: 'Op Costs', dbColumn: 'op_costs', type: 'string' },
  { header: 'Gross Rate', dbColumn: 'gross_rate', type: 'string' },
  { header: 'Sale Price', dbColumn: 'sale_price', type: 'string' },
  { header: 'Condo Fees', dbColumn: 'condo_fees', type: 'string' },
  { header: 'Property Tax', dbColumn: 'property_tax', type: 'string' },
  { header: 'Landlord/Owner/Developer', dbColumn: 'landlord', type: 'string' },
  { header: 'Sublease Exp.', dbColumn: 'sublease_exp', type: 'string' },
  
  // Links/notes
  { header: 'Brochure URL', dbColumn: 'link', type: 'string' },
  { header: 'Notes', dbColumn: 'notes_public', type: 'string' },
  { header: 'Last Verified', dbColumn: 'last_verified_date', type: 'date' },
];

// Special computed field: Unit/Bay for display_address
export const UNIT_BAY_HEADER = 'Unit/Bay';

// Filter columns - required for row inclusion
export const FILTER_COLUMNS = {
  STATUS: 'Status',
  DISTRIBUTION_WAREHOUSE: 'Distribution Warehouse?',
} as const;

/**
 * Check if a row should be included based on filter criteria:
 * - Status = "Active" (case-insensitive, trimmed)
 * - Distribution Warehouse? = TRUE/checked
 */
export function shouldIncludeRow(row: string[], headers: string[]): { include: boolean; reason?: string } {
  const statusIdx = findHeaderIndex(headers, FILTER_COLUMNS.STATUS);
  const distributionIdx = findHeaderIndex(headers, FILTER_COLUMNS.DISTRIBUTION_WAREHOUSE);
  
  // Get status value
  const statusValue = statusIdx !== -1 ? row[statusIdx]?.trim().toLowerCase() : '';
  if (statusValue !== 'active') {
    return { include: false, reason: `Status is "${row[statusIdx]?.trim() || 'empty'}" (must be "Active")` };
  }
  
  // Get distribution warehouse value
  const distributionValue = distributionIdx !== -1 ? row[distributionIdx]?.trim().toLowerCase() : '';
  const isTruthy = ['true', 'yes', 'y', '1', 'checked', 'x'].includes(distributionValue);
  if (!isTruthy) {
    return { include: false, reason: `"Distribution Warehouse?" is not checked/TRUE` };
  }
  
  return { include: true };
}

/**
 * Validate that filter columns exist in headers
 * @throws Error if assertion fails (for runtime safety)
 */
export function validateFilterColumns(headers: string[]): string[] {
  const missing: string[] = [];
  
  if (findHeaderIndex(headers, FILTER_COLUMNS.STATUS) === -1) {
    missing.push(FILTER_COLUMNS.STATUS);
  }
  if (findHeaderIndex(headers, FILTER_COLUMNS.DISTRIBUTION_WAREHOUSE) === -1) {
    missing.push(FILTER_COLUMNS.DISTRIBUTION_WAREHOUSE);
  }
  
  return missing;
}

/**
 * Runtime assertion: Throws if filter columns are missing.
 * Use this to prevent silent failures during sync.
 */
export function assertFilterColumnsExist(headers: string[]): void {
  const missing = validateFilterColumns(headers);
  if (missing.length > 0) {
    throw new Error(`Missing required columns: ${missing.join(', ')}`);
  }
}

/**
 * Runtime assertion: Throws if a row should not be included.
 * Use for debugging/testing to ensure filter logic is applied.
 */
export function assertRowShouldBeIncluded(row: string[], headers: string[]): void {
  const result = shouldIncludeRow(row, headers);
  if (!result.include) {
    throw new Error(`Row excluded: ${result.reason}`);
  }
}

// Directional indicators that should always remain uppercase
const DIRECTIONAL_INDICATORS = ['NW', 'NE', 'SW', 'SE', 'N', 'S', 'E', 'W'];

/**
 * Convert a string to title case, preserving directional indicators as uppercase.
 * "5555 69 AVENUE SE" → "5555 69 Avenue SE"
 */
function toTitleCase(str: string): string {
  return str.split(' ').map(word => {
    const upperWord = word.toUpperCase();
    if (DIRECTIONAL_INDICATORS.includes(upperWord)) {
      return upperWord;
    }
    if (/^\d+$/.test(word)) {
      return word;
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

/**
 * Normalize address strings for better geocoding and consistent display.
 * - Converts ALL CAPS to title case while preserving directional indicators
 * - Removes dashes between street numbers (e.g., "5555 - 69th" → "5555 69th")
 * - Removes ordinal suffixes (e.g., "69th" → "69")
 */
export function normalizeAddress(address: string): string {
  let normalized = address;
  normalized = toTitleCase(normalized);
  normalized = normalized.replace(/(\d+)\s*-\s+(\d)/g, '$1 $2');
  normalized = normalized.replace(/\b(\d+)(st|nd|rd|th)\b/gi, '$1');
  normalized = normalized.replace(/\s+/g, ' ').trim();
  return normalized;
}

/**
 * Normalize header for comparison (lowercase, trim whitespace)
 */
export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

/**
 * Find header index by name (case-insensitive)
 */
export function findHeaderIndex(headers: string[], targetHeader: string): number {
  const normalized = normalizeHeader(targetHeader);
  return headers.findIndex(h => normalizeHeader(h) === normalized);
}

/**
 * Get value from row by header name
 */
export function getValueByHeader(row: string[], headers: string[], headerName: string): string | undefined {
  const idx = findHeaderIndex(headers, headerName);
  if (idx === -1) return undefined;
  return row[idx]?.trim() || undefined;
}

/**
 * Parse a number from string, returns undefined if invalid
 */
export function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  // Remove commas, dollar signs, etc.
  const cleaned = value.replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : Math.round(num);
}

/**
 * Parse a date string, returns ISO date or undefined
 */
export function parseDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  // Try to parse common date formats
  const date = new Date(value);
  if (isNaN(date.getTime())) return undefined;
  return date.toISOString().split('T')[0];
}

/**
 * Compute display_address from Address and Unit/Bay
 */
export function computeDisplayAddress(row: string[], headers: string[]): string {
  const rawAddress = getValueByHeader(row, headers, 'Address') || '';
  const address = normalizeAddress(rawAddress);
  const unitBay = getValueByHeader(row, headers, UNIT_BAY_HEADER);
  
  if (unitBay) {
    return `${address} — ${unitBay}`;
  }
  return address;
}

/**
 * Map a row to a listing object using header-based field mapping
 */
export function mapRowToListing(
  row: string[], 
  headers: string[], 
  userId: string,
  orgId?: string
): { listing: Record<string, unknown>; missingHeaders: string[] } {
  const listing: Record<string, unknown> = {
    user_id: userId,
    org_id: orgId || null,
  };
  const missingHeaders: string[] = [];

  for (const mapping of FIELD_MAPPINGS) {
    const headerIdx = findHeaderIndex(headers, mapping.header);
    
    if (headerIdx === -1) {
      // Only track truly required headers as missing (ListingID, Address)
      if (mapping.required) {
        missingHeaders.push(mapping.header);
      }
      continue;
    }

    const rawValue = row[headerIdx]?.trim() || '';
    
    if (!rawValue) continue;

    // Special handling for include_in_issue (Distribution Warehouse? checkbox)
    if (mapping.dbColumn === 'include_in_issue') {
      const val = rawValue.toLowerCase();
      const isTruthy = ['true', 'yes', 'y', '1', 'checked', 'x'].includes(val);
      listing[mapping.dbColumn] = isTruthy;
      continue;
    }

    switch (mapping.type) {
      case 'number':
        const numValue = parseNumber(rawValue);
        if (numValue !== undefined) {
          listing[mapping.dbColumn] = numValue;
        }
        break;
      case 'date':
        const dateValue = parseDate(rawValue);
        if (dateValue) {
          listing[mapping.dbColumn] = dateValue;
        }
        break;
      default:
        listing[mapping.dbColumn] = rawValue;
    }
  }

  // Compute display_address
  listing.display_address = computeDisplayAddress(row, headers);

  // Normalize the address for better geocoding and consistent display
  if (listing.address) {
    listing.address = normalizeAddress(listing.address as string);
  }

  // Ensure required database columns have defaults (NOT NULL constraints)
  if (!listing.address) listing.address = '';
  if (!listing.city) listing.city = '';
  if (!listing.submarket) listing.submarket = '';
  if (!listing.size_sf) listing.size_sf = 0;
  
  // Default include_in_issue to true if not set (for distribution maps)
  if (listing.include_in_issue === undefined) {
    listing.include_in_issue = true;
  }

  // Normalize status to match database check constraint: Active, Leased, Removed, OnHold
  const validStatuses = ['Active', 'Leased', 'Removed', 'OnHold'];
  const rawStatus = (listing.status as string || '').trim();
  const normalizedStatus = validStatuses.find(
    s => s.toLowerCase() === rawStatus.toLowerCase()
  );
  listing.status = normalizedStatus || 'Active';

  // Ensure constrained columns have valid values (Yes/No/Unknown)
  const yesNoUnknownFields = ['yard', 'cross_dock', 'trailer_parking'] as const;
  for (const field of yesNoUnknownFields) {
    if (listing[field] === undefined || listing[field] === null) {
      listing[field] = 'Unknown';
    } else {
      const val = String(listing[field]).trim().toLowerCase();
      if (val === 'yes' || val === 'y' || val === 'true') {
        listing[field] = 'Yes';
      } else if (val === 'no' || val === 'n' || val === 'false') {
        listing[field] = 'No';
      } else {
        listing[field] = 'Unknown';
      }
    }
  }

  return { listing, missingHeaders };
}

/**
 * Validate headers and return missing required headers
 */
export function validateRequiredHeaders(headers: string[]): string[] {
  const missing: string[] = [];
  
  for (const mapping of FIELD_MAPPINGS) {
    if (mapping.required && findHeaderIndex(headers, mapping.header) === -1) {
      missing.push(mapping.header);
    }
  }
  
  return missing;
}

/**
 * Get all mapped headers that exist in the spreadsheet
 */
export function getMappedHeaders(headers: string[]): { found: string[]; missing: string[] } {
  const found: string[] = [];
  const missing: string[] = [];
  
  for (const mapping of FIELD_MAPPINGS) {
    if (findHeaderIndex(headers, mapping.header) !== -1) {
      found.push(mapping.header);
    } else {
      missing.push(mapping.header);
    }
  }
  
  // Also check Unit/Bay
  if (findHeaderIndex(headers, UNIT_BAY_HEADER) === -1) {
    missing.push(UNIT_BAY_HEADER);
  } else {
    found.push(UNIT_BAY_HEADER);
  }
  
  return { found, missing };
}
