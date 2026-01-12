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
  
  const newCount = Object.values(changeStatus).filter(s => s === 'new').length;
  const earliest = computeEarliestAvailability(selectedListings);

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

  const sizeRanges = computeSizeDistribution(sortedListings);
  const timeline = computeAvailabilityTimeline(sortedListings);

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
              {market} · {sizeThreshold}+ SF
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="brutalist-stat">
              <div className="brutalist-stat-label">Tracked</div>
              <div className="brutalist-stat-value">{selectedListings.length}</div>
            </div>
            <div className="brutalist-stat">
              <div className="brutalist-stat-label">Earliest</div>
              <div className="text-xl font-black mt-1">{earliest}</div>
            </div>
            <div className="brutalist-stat">
              <div className="brutalist-stat-label">New</div>
              <div className="brutalist-stat-value">{newCount}</div>
            </div>
          </div>

          {/* Charts Row */}
          {(sizeRanges.length > 0 || timeline.length > 0) && (
            <div className="grid grid-cols-2 gap-3 mb-8">
              {sizeRanges.length > 0 && (
                <div className="brutalist-chart">
                  <div className="brutalist-chart-title">Size Distribution</div>
                  {sizeRanges.map((item) => (
                    <div key={item.label} className="brutalist-chart-row">
                      <div className="brutalist-chart-label">{item.label}</div>
                      <div className="brutalist-chart-bar-bg">
                        <div className="brutalist-chart-bar" style={{ width: `${item.pct}%` }} />
                      </div>
                      <div className="brutalist-chart-value">{item.count}</div>
                    </div>
                  ))}
                </div>
              )}
              {timeline.length > 0 && (
                <div className="brutalist-chart">
                  <div className="brutalist-chart-title">Availability Timeline</div>
                  {timeline.map((item) => (
                    <div key={item.label} className="brutalist-chart-row">
                      <div className="brutalist-chart-label">{item.label}</div>
                      <div className="brutalist-chart-bar-bg">
                        <div className="brutalist-chart-bar" style={{ width: `${item.pct}%` }} />
                      </div>
                      <div className="brutalist-chart-value">{item.count}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* How to Use */}
          <div className="brutalist-section mb-8">
            <div className="brutalist-section-header">
              <span className="text-xs font-bold uppercase tracking-wider">How to Use This</span>
            </div>
            <div className="brutalist-section-body">
              <p className="text-sm leading-relaxed">
                The summary table on the next page lists all tracked availabilities.
                If any space fits your criteria, reply with the property address and we'll
                confirm timing, trailer parking, and arrange a tour.
              </p>
            </div>
          </div>

          {/* Contacts */}
          <div className="grid grid-cols-2 gap-6 pt-6 border-t-2 border-foreground">
            <div className="contact-block">
              <div className="contact-name">{primary.name}</div>
              <div className="contact-detail">{primary.email}</div>
              {primary.phone && <div className="contact-detail">{primary.phone}</div>}
            </div>
            <div className="contact-block">
              <div className="contact-name">{secondary.name}</div>
              <div className="contact-detail">{secondary.email}</div>
              {secondary.phone && <div className="contact-detail">{secondary.phone}</div>}
            </div>
          </div>
        </div>

        {/* PAGE 2: SUMMARY TABLE */}
        <div className="document-page">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-headline">Availability Summary</h2>
              <p className="text-caption mt-1">{market} · Threshold: {sizeThreshold} SF</p>
            </div>
            <div className="text-micro">{selectedListings.length} Properties</div>
          </div>

          <div className="brutalist-section">
            <table className="brutalist-table">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Property / Submarket</th>
                  <th className="num" style={{ width: '10%' }}>Size (SF)</th>
                  <th className="num" style={{ width: '9%' }}>Clear</th>
                  <th className="num" style={{ width: '8%' }}>Dock</th>
                  <th className="num" style={{ width: '8%' }}>Drive</th>
                  <th style={{ width: '10%' }}>Trailer</th>
                  <th style={{ width: '13%' }}>Avail.</th>
                  <th style={{ width: '14%' }}>Rate</th>
                </tr>
              </thead>
              <tbody>
                {sortedListings.slice(0, 12).map((listing) => (
                  <tr key={listing.id}>
                    <td>
                      <div className="font-bold text-sm">
                        {listing.property_name || listing.address}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {listing.submarket}
                      </div>
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
                    <td>
                      {listing.asking_rate_psf || 'Market'}
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
            Information believed reliable but not guaranteed. Rates and availability subject to change.
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
              <div className="brutalist-stat col-span-2">
                <div className="brutalist-stat-label">Asking Rate</div>
                <div className="text-2xl font-black">{listing.asking_rate_psf || 'Market'}</div>
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

            <div className="grid grid-cols-2 gap-6 pt-6 border-t-2 border-foreground mt-auto">
              <div className="contact-block">
                <div className="contact-name">{primary.name}</div>
                <div className="contact-detail">{primary.email}</div>
                {primary.phone && <div className="contact-detail">{primary.phone}</div>}
              </div>
              <div className="contact-block">
                <div className="contact-name">{secondary.name}</div>
                <div className="contact-detail">{secondary.email}</div>
                {secondary.phone && <div className="contact-detail">{secondary.phone}</div>}
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

function computeEarliestAvailability(listings: Listing[]): string {
  const rank = (v: string | null) => {
    const s = (v || '').toLowerCase().trim();
    if (!s || s === 'tbd' || s === 'unknown') return 999999;
    if (s.includes('immediate') || s.includes('now')) return 0;
    const t = Date.parse(v || '');
    if (!Number.isNaN(t)) return t;
    const m = s.match(/q([1-4])\s*(20\d{2})/i);
    if (m) {
      const q = Number(m[1]);
      const y = Number(m[2]);
      return Date.UTC(y, (q - 1) * 3, 1);
    }
    return 900000;
  };

  let best = 'TBD';
  let bestRank = 9999999;

  for (const l of listings) {
    const v = l.availability_date || 'TBD';
    const r = rank(v);
    if (r < bestRank) {
      bestRank = r;
      best = v;
    }
  }
  return best;
}

function computeSizeDistribution(listings: Listing[]): Array<{ label: string; count: number; pct: number }> {
  const ranges = [
    { min: 100000, max: 149999, label: '100-150K' },
    { min: 150000, max: 199999, label: '150-200K' },
    { min: 200000, max: 299999, label: '200-300K' },
    { min: 300000, max: Infinity, label: '300K+' },
  ];

  const counts = ranges.map(r => ({
    label: r.label,
    count: listings.filter(l => {
      const sf = l.size_sf || 0;
      return sf >= r.min && sf <= r.max;
    }).length,
  }));

  const maxCount = Math.max(...counts.map(c => c.count), 1);
  return counts.filter(c => c.count > 0).map(c => ({
    ...c,
    pct: Math.round((c.count / maxCount) * 100),
  }));
}

function computeAvailabilityTimeline(listings: Listing[]): Array<{ label: string; count: number; pct: number }> {
  const now = new Date();
  const sixMonths = new Date(now);
  sixMonths.setMonth(sixMonths.getMonth() + 6);
  const twelveMonths = new Date(now);
  twelveMonths.setMonth(twelveMonths.getMonth() + 12);
  const twentyFourMonths = new Date(now);
  twentyFourMonths.setMonth(twentyFourMonths.getMonth() + 24);

  let immediate = 0;
  let sixToTwelve = 0;
  let twelveTo24 = 0;
  let later = 0;

  for (const l of listings) {
    const av = (l.availability_date || '').toLowerCase().trim();
    if (!av || av === 'tbd' || av === 'unknown') {
      later++;
      continue;
    }
    if (av.includes('immediate') || av.includes('now')) {
      immediate++;
      continue;
    }
    const parsed = Date.parse(l.availability_date || '');
    if (!Number.isNaN(parsed)) {
      const d = new Date(parsed);
      if (d <= sixMonths) {
        immediate++;
      } else if (d <= twelveMonths) {
        sixToTwelve++;
      } else if (d <= twentyFourMonths) {
        twelveTo24++;
      } else {
        later++;
      }
    } else {
      later++;
    }
  }

  const results = [
    { label: 'Immediate', count: immediate },
    { label: '6-12 mo', count: sixToTwelve },
    { label: '12-24 mo', count: twelveTo24 },
    { label: 'Later', count: later },
  ];

  const maxCount = Math.max(...results.map(r => r.count), 1);
  return results.filter(r => r.count > 0).map(r => ({
    ...r,
    pct: Math.round((r.count / maxCount) * 100),
  }));
}
