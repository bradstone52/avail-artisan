import { Listing, IssueSettings } from '@/lib/types';
import { format } from 'date-fns';

interface PreviewStepProps {
  settings: IssueSettings;
  listings: Listing[];
  selectedIds: string[];
  executiveNotes: Record<string, string>;
  changeStatus: Record<string, 'new' | 'changed' | 'unchanged'>;
  includeDetails?: boolean;
}

// Default contacts
const DEFAULT_PRIMARY = {
  name: "Brad Stone",
  email: "brad@cvpartners.ca",
  phone: "(403) 613-2898",
};

const DEFAULT_SECONDARY = {
  name: "Doug Johannson",
  email: "doug@cvpartners.ca",
  phone: "(403) 470-8875",
};

export function PreviewStep({ 
  settings, 
  listings, 
  selectedIds, 
  executiveNotes,
  changeStatus,
  includeDetails = false,
}: PreviewStepProps) {
  const selectedListings = listings.filter(l => selectedIds.includes(l.id));
  const sortedListings = [...selectedListings].sort((a, b) => b.size_sf - a.size_sf);
  
  const issueTitle = settings.title || "Large-Format Distribution Availability";
  const market = settings.market || "Calgary Region";
  const sizeThreshold = settings.sizeThreshold?.toLocaleString() || "100,000";
  const sizeThresholdMax = settings.sizeThresholdMax?.toLocaleString() || "500,000";
  
  const newCount = Object.values(changeStatus).filter(s => s === 'new').length;

  const primary = {
    name: settings.primaryContactName || DEFAULT_PRIMARY.name,
    email: settings.primaryContactEmail || DEFAULT_PRIMARY.email,
    phone: settings.primaryContactPhone || DEFAULT_PRIMARY.phone,
  };

  const secondary = {
    name: settings.secondaryContactName || DEFAULT_SECONDARY.name,
    email: settings.secondaryContactEmail || DEFAULT_SECONDARY.email,
    phone: settings.secondaryContactPhone || DEFAULT_SECONDARY.phone,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-headline mb-1">Preview</h2>
        <p className="text-caption">
          Review your market snapshot before generating the PDF
        </p>
      </div>

      {/* Neo-Brutalist Document Preview */}
      <div className="document-wrapper">
        
        {/* PAGE 1: COVER */}
        <div className="document-page">
          {/* Header */}
          <div className="flex justify-between items-start mb-10">
            <div className="brutalist-badge">
              ClearView Commercial Realty Inc.
            </div>
            <div className="text-micro">
              Published {format(new Date(), 'MMMM d, yyyy')}
            </div>
          </div>

          {/* Title */}
          <div className="mb-10">
            <h1 className="text-display mb-3">{issueTitle}</h1>
            <p className="text-subhead text-muted-foreground">
              {market} · {sizeThreshold}–{sizeThresholdMax} SF
            </p>
          </div>

          {/* Stats Row - Only 2 stats: Tracked and New */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="brutalist-stat" style={{ padding: '20px 24px' }}>
              <div className="brutalist-stat-label">Tracked</div>
              <div className="brutalist-stat-value text-4xl">{selectedListings.length}</div>
            </div>
            <div className="brutalist-stat" style={{ padding: '20px 24px' }}>
              <div className="brutalist-stat-label">New</div>
              <div className="brutalist-stat-value text-4xl">{newCount}</div>
            </div>
          </div>

          {/* Contacts - Two distinct columns with clear spacing */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t-2 border-foreground mt-auto">
            <div className="contact-block">
              <div className="contact-name text-base font-bold mb-1">{primary.name}</div>
              <div className="contact-detail text-sm">{primary.email}</div>
              {primary.phone && <div className="contact-detail text-sm">{primary.phone}</div>}
            </div>
            <div className="contact-block">
              <div className="contact-name text-base font-bold mb-1">{secondary.name}</div>
              <div className="contact-detail text-sm">{secondary.email}</div>
              {secondary.phone && <div className="contact-detail text-sm">{secondary.phone}</div>}
            </div>
          </div>
        </div>

        {/* PAGE 2: SUMMARY TABLE */}
        <div className="document-page">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-headline">Availability Summary</h2>
              <p className="text-caption mt-1">{market} · {sizeThreshold}–{sizeThresholdMax} SF</p>
            </div>
            <div className="text-micro">{selectedListings.length} Properties</div>
          </div>

          <div className="brutalist-section">
            <table className="brutalist-table">
              <thead>
                <tr>
                  <th style={{ width: '26%' }}>Property / Submarket</th>
                  <th style={{ width: '12%' }}>City</th>
                  <th className="num" style={{ width: '10%' }}>Size (SF)</th>
                  <th className="num" style={{ width: '9%' }}>Clear</th>
                  <th className="num" style={{ width: '9%' }}>Dock</th>
                  <th className="num" style={{ width: '9%' }}>Drive</th>
                  <th style={{ width: '10%' }}>Trailer</th>
                  <th style={{ width: '15%' }}>Avail.</th>
                </tr>
              </thead>
              <tbody>
                {sortedListings.slice(0, 12).map((listing) => (
                  <tr key={listing.id} style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                    <td>
                      <div className="font-bold text-sm">
                        {listing.property_name || listing.address}
                      </div>
                      {/* Submarket: no truncation, wrap to 2 lines max */}
                      <div 
                        className="text-xs text-muted-foreground mt-0.5"
                        style={{ 
                          whiteSpace: 'normal', 
                          overflow: 'visible', 
                          textOverflow: 'clip',
                          wordBreak: 'normal',
                          overflowWrap: 'anywhere'
                        }}
                      >
                        {listing.submarket}
                      </div>
                    </td>
                    <td className="text-sm">
                      {listing.city || '—'}
                    </td>
                    <td className="num font-medium">
                      {listing.size_sf.toLocaleString()}
                    </td>
                    <td className="num">
                      {listing.clear_height_ft ? `${listing.clear_height_ft}'` : '—'}
                    </td>
                    <td className="num">
                      {listing.dock_doors ?? '—'}
                    </td>
                    <td className="num">
                      {listing.drive_in_doors ?? '—'}
                    </td>
                    <td>
                      {normalizeYesNo(listing.trailer_parking)}
                    </td>
                    <td>
                      {listing.availability_date || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sortedListings.length > 12 && (
            <p className="text-center text-caption mt-4">
              + {sortedListings.length - 12} more properties in full PDF
            </p>
          )}

          <p className="text-xs text-muted-foreground mt-6">
            Information believed reliable but not guaranteed. Availability subject to change.
          </p>
        </div>

        {/* DETAIL PAGES (Optional) */}
        {includeDetails && sortedListings.map((listing) => (
          <div key={`detail-${listing.id}`} className="document-page">
            <div className="mb-6">
              <h2 className="text-headline mb-1">
                {listing.property_name || listing.address}
              </h2>
              <p className="text-caption">
                {[listing.city, listing.submarket].filter(Boolean).join(' · ')}
              </p>
              <p className="text-micro mt-2">ID: {listing.listing_id}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="brutalist-stat">
                <div className="brutalist-stat-label">Total Area</div>
                <div className="text-2xl font-black">{listing.size_sf.toLocaleString()} SF</div>
              </div>
              <div className="brutalist-stat">
                <div className="brutalist-stat-label">Clear Height</div>
                <div className="text-2xl font-black">
                  {listing.clear_height_ft ? `${listing.clear_height_ft}'` : '—'}
                </div>
              </div>
              <div className="brutalist-stat">
                <div className="brutalist-stat-label">Dock Doors</div>
                <div className="text-2xl font-black">{listing.dock_doors ?? '—'}</div>
              </div>
              <div className="brutalist-stat">
                <div className="brutalist-stat-label">Drive-In Doors</div>
                <div className="text-2xl font-black">{listing.drive_in_doors ?? '—'}</div>
              </div>
              <div className="brutalist-stat">
                <div className="brutalist-stat-label">Trailer Parking</div>
                <div className="text-2xl font-black">{normalizeYesNo(listing.trailer_parking)}</div>
              </div>
              <div className="brutalist-stat">
                <div className="brutalist-stat-label">Availability</div>
                <div className="text-2xl font-black">{listing.availability_date || '—'}</div>
              </div>
            </div>

            {(listing.notes_public || executiveNotes[listing.id]) && (
              <div className="brutalist-section mb-6">
                <div className="brutalist-section-header">
                  <span className="text-xs font-bold uppercase tracking-wider">Notes</span>
                </div>
                <div className="brutalist-section-body">
                  <p className="text-sm leading-relaxed">
                    {executiveNotes[listing.id] || listing.notes_public}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-8 pt-6 border-t-2 border-foreground mt-auto">
              <div className="contact-block">
                <div className="contact-name text-base font-bold mb-1">{primary.name}</div>
                <div className="contact-detail text-sm">{primary.email}</div>
                {primary.phone && <div className="contact-detail text-sm">{primary.phone}</div>}
              </div>
              <div className="contact-block">
                <div className="contact-name text-base font-bold mb-1">{secondary.name}</div>
                <div className="contact-detail text-sm">{secondary.email}</div>
                {secondary.phone && <div className="contact-detail text-sm">{secondary.phone}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Helpers ============

function normalizeYesNo(v: string | null | undefined): string {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return '—';
  if (['yes', 'y', 'true', '1'].includes(s)) return 'Yes';
  if (['no', 'n', 'false', '0'].includes(s)) return 'No';
  if (['unknown', 'tbd'].includes(s)) return '—';
  return v || '—';
}
