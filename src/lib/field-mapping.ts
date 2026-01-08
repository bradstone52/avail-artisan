// Field mapping configuration: spreadsheet header -> database column
// Header names are normalized (lowercase, trimmed) for matching

export interface FieldMapping {
  header: string;        // Exact header name from spreadsheet
  dbColumn: string;      // Database column name
  type: 'string' | 'number' | 'date';
  required?: boolean;
}

export const FIELD_MAPPINGS: FieldMapping[] = [
  // Identity
  { header: 'ListingID', dbColumn: 'listing_id', type: 'string', required: true },
  
  // Core
  { header: 'Address', dbColumn: 'address', type: 'string', required: true },
  { header: 'Municipality', dbColumn: 'city', type: 'string', required: true },
  { header: 'Status', dbColumn: 'status', type: 'string', required: true },
  { header: 'Submarket', dbColumn: 'submarket', type: 'string', required: true },
  { header: 'Listing Type', dbColumn: 'listing_type', type: 'string' },
  { header: 'Broker', dbColumn: 'broker_source', type: 'string' },
  
  // Specs
  { header: 'Total SF', dbColumn: 'size_sf', type: 'number' },
  { header: 'Warehouse SF', dbColumn: 'warehouse_sf', type: 'number' },
  { header: 'Office SF', dbColumn: 'office_sf', type: 'number' },
  { header: 'Ceiling Ht.', dbColumn: 'clear_height_ft', type: 'number' },
  { header: 'Dock Doors', dbColumn: 'dock_doors', type: 'number' },
  { header: 'Drive-in Doors', dbColumn: 'drive_in_doors', type: 'number' },
  { header: 'Power (Amps)', dbColumn: 'power_amps', type: 'string' },
  { header: 'Voltage', dbColumn: 'voltage', type: 'string' },
  { header: 'Yard Area', dbColumn: 'yard', type: 'string' },
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
  const address = getValueByHeader(row, headers, 'Address') || '';
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
  userId: string
): { listing: Record<string, unknown>; missingHeaders: string[] } {
  const listing: Record<string, unknown> = {
    user_id: userId,
  };
  const missingHeaders: string[] = [];

  for (const mapping of FIELD_MAPPINGS) {
    const headerIdx = findHeaderIndex(headers, mapping.header);
    
    if (headerIdx === -1) {
      if (mapping.required) {
        missingHeaders.push(mapping.header);
      }
      continue;
    }

    const rawValue = row[headerIdx]?.trim() || '';
    
    if (!rawValue) continue;

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
