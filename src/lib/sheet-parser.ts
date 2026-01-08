import { Listing, ParsedListing, ValidationError, REQUIRED_COLUMNS } from './types';

export function parseCSV(csvText: string): string[][] {
  const lines = csvText.split('\n');
  const result: string[][] = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const row: string[] = [];
    let cell = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(cell.trim());
        cell = '';
      } else {
        cell += char;
      }
    }
    row.push(cell.trim());
    result.push(row);
  }
  
  return result;
}

export function validateHeaders(headers: string[]): { valid: boolean; missing: string[] } {
  const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z]/g, ''));
  const missing: string[] = [];
  
  for (const required of REQUIRED_COLUMNS) {
    const normalized = required.toLowerCase().replace(/[^a-z]/g, '');
    if (!normalizedHeaders.includes(normalized)) {
      missing.push(required);
    }
  }
  
  return { valid: missing.length === 0, missing };
}

export function getColumnIndex(headers: string[], columnName: string): number {
  const normalizedTarget = columnName.toLowerCase().replace(/[^a-z]/g, '');
  return headers.findIndex(h => 
    h.toLowerCase().replace(/[^a-z]/g, '') === normalizedTarget
  );
}

export function parseListingRow(
  row: string[], 
  headers: string[], 
  rowNumber: number
): ParsedListing {
  const errors: ValidationError[] = [];
  
  const getValue = (columnName: string): string => {
    const index = getColumnIndex(headers, columnName);
    return index >= 0 ? (row[index] || '').trim() : '';
  };
  
  const getNumberValue = (columnName: string): number | null => {
    const val = getValue(columnName);
    if (!val) return null;
    const num = parseFloat(val.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? null : num;
  };
  
  const getBooleanValue = (columnName: string): boolean => {
    const val = getValue(columnName).toLowerCase();
    return val === 'true' || val === 'yes' || val === '1';
  };
  
  const getEnumValue = <T extends string>(
    columnName: string, 
    validValues: T[], 
    defaultValue: T
  ): T => {
    const val = getValue(columnName);
    const normalized = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
    return validValues.includes(normalized as T) ? normalized as T : defaultValue;
  };
  
  // Required field validation
  const listingId = getValue('ListingID');
  if (!listingId) {
    errors.push({ row: rowNumber, field: 'ListingID', message: 'ListingID is required' });
  }
  
  const address = getValue('Address');
  if (!address) {
    errors.push({ row: rowNumber, field: 'Address', message: 'Address is required' });
  }
  
  const city = getValue('City');
  if (!city) {
    errors.push({ row: rowNumber, field: 'City', message: 'City is required' });
  }
  
  const submarket = getValue('Submarket');
  if (!submarket) {
    errors.push({ row: rowNumber, field: 'Submarket', message: 'Submarket is required' });
  }
  
  const sizeSf = getNumberValue('SizeSF');
  if (sizeSf === null || sizeSf <= 0) {
    errors.push({ row: rowNumber, field: 'SizeSF', message: 'SizeSF must be a positive number' });
  }
  
  const status = getEnumValue('Status', ['Active', 'Leased', 'Removed', 'OnHold'], 'Active');
  
  const data: Partial<Listing> = {
    listing_id: listingId,
    property_name: getValue('PropertyName') || null,
    address,
    city,
    submarket,
    size_sf: sizeSf || 0,
    clear_height_ft: getNumberValue('ClearHeightFt'),
    dock_doors: getNumberValue('DockDoors') || 0,
    drive_in_doors: getNumberValue('DriveInDoors') || 0,
    yard: getEnumValue('Yard', ['Yes', 'No', 'Unknown'], 'Unknown'),
    availability_date: getValue('AvailabilityDate') || null,
    asking_rate_psf: getValue('AskingRatePSF') || null,
    status,
    include_in_issue: getBooleanValue('IncludeInIssue'),
    landlord: getValue('Landlord') || null,
    broker_source: getValue('BrokerSource') || null,
    notes_public: getValue('NotesPublic') || null,
    internal_note: getValue('InternalNote') || null,
    link: getValue('Link') || null,
    photo_url: getValue('PhotoURL') || null,
    last_verified_date: getValue('LastVerifiedDate') || null,
    power_amps: getValue('PowerAmps') || null,
    sprinkler: getValue('Sprinkler') || null,
    office_percent: getValue('OfficePercent') || null,
    cross_dock: getEnumValue('CrossDock', ['Yes', 'No', 'Unknown'], 'Unknown'),
    trailer_parking: getEnumValue('TrailerParking', ['Yes', 'No', 'Unknown'], 'Unknown'),
  };
  
  return {
    data,
    errors,
    isValid: errors.length === 0,
  };
}

export function generateTemplateCSV(): string {
  const headers = [
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
  ];
  
  return headers.join(',');
}

export function generateSampleData(): string {
  const headers = generateTemplateCSV();
  
  const sampleRows = [
    'PROP001,Ironwood Distribution Centre,12345 Industrial Blvd,Calgary,Southeast Industrial,250000,36,48,4,Yes,2025-03-01,$12.50-$14.00,Active,TRUE,ABC REIT,CoStar,Modern cross-dock facility,Strong tenant interest,https://example.com/prop001,,2025-01-01,2000A,ESFR,5%,Yes,Yes',
    'PROP002,Gateway Logistics Park,5678 Gateway Dr,Calgary,Balzac,185000,32,32,2,Yes,2025-04-15,Market,Active,TRUE,XYZ Properties,Internal,Excellent highway access,Multiple tours scheduled,https://example.com/prop002,,2025-01-05,1600A,Wet,3%,No,Yes',
    'PROP003,Crossroads Industrial,9999 Crossroads Way,Calgary,Northeast Industrial,120000,28,24,3,No,2025-02-01,$11.00-$12.00,Active,TRUE,,,Quality spec building,,,,2024-12-15,1200A,ESFR,8%,No,No',
    'PROP004,Starlight Warehouse,3333 Warehouse Lane,Airdrie,Airdrie,95000,30,16,2,Unknown,Immediate,$10.50,Active,TRUE,Starlight Investments,Sign Call,Available now,Landlord motivated,,,,1000A,Wet,10%,Unknown,Unknown',
    'PROP005,Heritage Industrial,7777 Heritage Rd,Calgary,Southeast Industrial,310000,40,64,6,Yes,2025-06-01,$15.00-$17.00,Active,TRUE,Caisse de depot,CoStar,Flagship distribution facility,Premium location,https://example.com/prop005,,2025-01-10,3000A,ESFR,2%,Yes,Yes',
  ];
  
  return [headers, ...sampleRows].join('\n');
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
