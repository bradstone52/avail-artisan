import { useState } from 'react';
import { Listing, IssueSettings } from '@/lib/types';
import { format } from 'date-fns';
import { formatSubmarket } from '@/lib/formatters';

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
  title: "Partner, Associate Broker",
  email: "brad@cvpartners.ca",
  phone: "(403) 613-2898",
};

const DEFAULT_SECONDARY = {
  name: "Doug Johannson",
  title: "Partner, Senior Vice President",
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
  const [coverImageError, setCoverImageError] = useState(false);
  
  const selectedListings = listings.filter(l => selectedIds.includes(l.id));
  const sortedListings = [...selectedListings].sort((a, b) => b.size_sf - a.size_sf);
  
  const issueTitle = settings.title || "Large-Format Distribution Availability";
  const market = settings.market || "Calgary Region";
  const sizeThreshold = settings.sizeThreshold?.toLocaleString() || "100,000";
  const sizeThresholdMax = settings.sizeThresholdMax?.toLocaleString() || "500,000";
  
  const newCount = Object.values(changeStatus).filter(s => s === 'new').length;

  // Cover image: only use if uploaded and valid, otherwise null (no image)
  const hasCoverImage = settings.coverImageUrl && !coverImageError;

  const primary = {
    name: settings.primaryContactName || DEFAULT_PRIMARY.name,
    title: settings.primaryContactTitle || DEFAULT_PRIMARY.title,
    email: settings.primaryContactEmail || DEFAULT_PRIMARY.email,
    phone: settings.primaryContactPhone || DEFAULT_PRIMARY.phone,
  };

  const secondary = {
    name: settings.secondaryContactName || DEFAULT_SECONDARY.name,
    title: settings.secondaryContactTitle || DEFAULT_SECONDARY.title,
    email: settings.secondaryContactEmail || DEFAULT_SECONDARY.email,
    phone: settings.secondaryContactPhone || DEFAULT_SECONDARY.phone,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-headline mb-1">Preview</h2>
        <p className="text-caption">
          Review your market report before generating the PDF
        </p>
      </div>

      {/* Neo-Brutalist Document Preview */}
      <div className="document-wrapper">
        
        {/* PAGE 1: COVER */}
        <div className="document-page" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Cover Hero Image - Only render if image exists */}
          {hasCoverImage && (
            <div 
              className="w-full"
              style={{ 
                height: '38%',
                backgroundImage: `url(${settings.coverImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {/* Hidden image to detect load errors */}
              <img 
                src={settings.coverImageUrl!} 
                alt="" 
                style={{ display: 'none' }}
                onError={() => {
                  if (!coverImageError) {
                    console.error('Cover image failed to load:', settings.coverImageUrl);
                    setCoverImageError(true);
                  }
                }}
              />
            </div>
          )}
          
          {/* Cover Content - adjusts height based on whether image exists */}
          <div 
            className="p-8 flex flex-col" 
            style={{ height: hasCoverImage ? '62%' : '100%' }}
          >
            {/* Brand Badge */}
            <div className="brutalist-badge mb-6">
              ClearView Commercial Realty Inc.
            </div>

            {/* Title */}
            <div className="mb-6">
              <h1 className="text-display mb-2">
                Large-Format Distribution Availabilities —<br/>January 2026, Calgary & Area
              </h1>
              <p className="text-subhead text-muted-foreground">
                Curated selection of logistics-capable space in the Calgary region and surrounding areas
              </p>
            </div>

            {/* Stats - Clean unboxed KPI */}
            <div className="mb-6">
              <div className="text-4xl font-black">{selectedListings.length}</div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tracked listings</div>
            </div>

            {/* Contacts - Doug LEFT, Brad RIGHT with titles */}
            <div className="grid grid-cols-2 gap-8 pt-6 border-t-2 border-foreground mt-auto">
              <div className="contact-block">
                <div className="text-lg font-bold mb-1">{secondary.name}</div>
                <div className="text-sm text-muted-foreground mb-2">{secondary.title}</div>
                <div className="text-sm">{secondary.email}</div>
                {secondary.phone && <div className="text-sm">{secondary.phone}</div>}
              </div>
              <div className="contact-block">
                <div className="text-lg font-bold mb-1">{primary.name}</div>
                <div className="text-sm text-muted-foreground mb-2">{primary.title}</div>
                <div className="text-sm">{primary.email}</div>
                {primary.phone && <div className="text-sm">{primary.phone}</div>}
              </div>
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
                  <th style={{ width: '24%' }}>Property / Submarket</th>
                  <th style={{ width: '12%' }}>City</th>
                  <th className="num" style={{ width: '9%' }}>Size (SF)</th>
                  <th style={{ width: '9%', textAlign: 'center' }}>Ceiling Ht</th>
                  <th style={{ width: '8%', textAlign: 'center' }}>Docks</th>
                  <th style={{ width: '8%', textAlign: 'center' }}>Drive-In</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>Op Costs</th>
                  <th style={{ width: '10%' }}>Avail.</th>
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
                        {formatSubmarket(listing.submarket)}
                      </div>
                    </td>
                    <td className="text-sm">
                      {listing.city || '—'}
                    </td>
                    <td className="num font-medium">
                      {listing.size_sf.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {listing.clear_height_ft ? `${listing.clear_height_ft}'` : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {listing.dock_doors ?? '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {(listing.drive_in_doors == null || listing.drive_in_doors === 0) ? '—' : listing.drive_in_doors}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {listing.op_costs && String(listing.op_costs).trim() ? listing.op_costs : '—'}
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
                {[listing.city, formatSubmarket(listing.submarket)].filter(Boolean).join(' · ')}
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
                <div className="text-2xl font-black">{(listing.drive_in_doors == null || listing.drive_in_doors === 0) ? '—' : listing.drive_in_doors}</div>
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
                <div className="text-lg font-bold mb-1">{secondary.name}</div>
                <div className="text-sm text-muted-foreground mb-2">{secondary.title}</div>
                <div className="text-sm">{secondary.email}</div>
                {secondary.phone && <div className="text-sm">{secondary.phone}</div>}
              </div>
              <div className="contact-block">
                <div className="text-lg font-bold mb-1">{primary.name}</div>
                <div className="text-sm text-muted-foreground mb-2">{primary.title}</div>
                <div className="text-sm">{primary.email}</div>
                {primary.phone && <div className="text-sm">{primary.phone}</div>}
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
