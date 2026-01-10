import { Listing, IssueSettings } from '@/lib/types';
import { format } from 'date-fns';

interface PreviewStepProps {
  settings: IssueSettings;
  listings: Listing[];
  selectedIds: string[];
  executiveNotes: Record<string, string>;
  changeStatus: Record<string, 'new' | 'changed' | 'unchanged'>;
}

export function PreviewStep({ 
  settings, 
  listings, 
  selectedIds, 
  executiveNotes,
  changeStatus 
}: PreviewStepProps) {
  const selectedListings = listings.filter(l => selectedIds.includes(l.id));
  const sortedListings = [...selectedListings].sort((a, b) => b.size_sf - a.size_sf);
  
  const issueTitle = settings.title || "Large-Format Distribution Availability";
  const market = settings.market || "Calgary Region";
  const sizeThreshold = settings.sizeThreshold?.toLocaleString() || "100,000";
  
  const newCount = Object.values(changeStatus).filter(s => s === 'new').length;
  const earliest = computeEarliestAvailability(selectedListings);

  const primary = {
    name: settings.primaryContactName || "Brad Stone",
    email: settings.primaryContactEmail || "brad@cvpartners.ca",
    phone: settings.primaryContactPhone || "(403) 613-2898",
  };

  const secondary = {
    name: settings.secondaryContactName || "Doug Johannson",
    email: settings.secondaryContactEmail || "doug@cvpartners.ca",
    phone: settings.secondaryContactPhone || "",
  };

  // Chart data
  const sizeRanges = computeSizeDistribution(sortedListings);
  const timeline = computeAvailabilityTimeline(sortedListings);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Preview</h2>
        <p className="text-muted-foreground text-sm">
          Review your market snapshot before generating the PDF
        </p>
      </div>

      {/* PDF Preview Container */}
      <div className="border border-border rounded-lg overflow-hidden bg-white">
        
        {/* Page 1: Cover */}
        <div className="p-8 border-b border-border">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="h-7 object-contain" />
              ) : (
                <span className="text-sm font-semibold text-foreground">ClearView Commercial Realty Inc.</span>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {format(new Date(), 'MMMM d, yyyy')}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">
            {issueTitle}
          </h1>
          <p className="text-lg text-muted-foreground mb-10">
            {market} · {sizeThreshold}+ SF
          </p>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <StatBox label="Total Spaces Tracked" value={String(selectedListings.length)} />
            <StatBox label="Earliest Availability" value={earliest} />
            <StatBox label="New This Period" value={String(newCount)} />
          </div>

          {/* How to Use */}
          <div className="bg-muted/50 border border-border rounded-md p-4 mb-8">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">
              How to Use This Report
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Review the summary table on the next page to identify properties that meet your criteria.
              Reply with the property address or listing ID for tours, timing confirmation, or additional details.
            </p>
          </div>

          {/* Footer Contacts */}
          <div className="border-t border-border pt-5 grid grid-cols-2 gap-6">
            <ContactBlock name={primary.name} email={primary.email} phone={primary.phone} />
            <ContactBlock name={secondary.name} email={secondary.email} phone={secondary.phone} />
          </div>
        </div>

        {/* Page 2: Summary Table */}
        <div className="p-8">
          {/* Header */}
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Availability Summary</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Sorted by size · Trailer shown only where confirmed · "Market" = rate not stated
              </p>
            </div>
            <div className="bg-muted/50 border border-border rounded px-3 py-2 text-right">
              <p className="text-sm font-semibold text-foreground">{market}</p>
              <p className="text-xs text-muted-foreground">{sizeThreshold}+ SF</p>
            </div>
          </div>

          {/* Charts */}
          {(sizeRanges.length > 0 || timeline.length > 0) && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              {sizeRanges.length > 0 && (
                <ChartBox title="By Size Range" data={sizeRanges} />
              )}
              {timeline.length > 0 && (
                <ChartBox title="By Availability Timeline" data={timeline} />
              )}
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Property / Submarket
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Size (SF)
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Clear Height
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Dock
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Drive-In
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Trailer
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Availability
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedListings.slice(0, 10).map((listing, idx) => (
                  <tr key={listing.id} className={idx % 2 === 1 ? 'bg-muted/30' : ''}>
                    <td className="px-3 py-2.5">
                      <span className="font-semibold text-foreground block">
                        {listing.property_name || listing.address}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {listing.submarket}
                      </span>
                    </td>
                    <td className="text-right px-3 py-2.5 text-foreground">
                      {listing.size_sf.toLocaleString()}
                    </td>
                    <td className="text-right px-3 py-2.5 text-foreground">
                      {listing.clear_height_ft ? `${listing.clear_height_ft}'` : '—'}
                    </td>
                    <td className="text-right px-3 py-2.5 text-foreground">
                      {listing.dock_doors ?? '—'}
                    </td>
                    <td className="text-right px-3 py-2.5 text-foreground">
                      {listing.drive_in_doors ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-foreground">
                      {normalizeYesNo(listing.trailer_parking)}
                    </td>
                    <td className="px-3 py-2.5 text-foreground">
                      {listing.availability_date || 'TBD'}
                    </td>
                    <td className="px-3 py-2.5 text-foreground">
                      {listing.asking_rate_psf || 'Market'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sortedListings.length > 10 && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              + {sortedListings.length - 10} more properties in full PDF
            </p>
          )}

          {/* Footer Note */}
          <p className="text-xs text-muted-foreground mt-6">
            Information believed reliable but not guaranteed. Rates and availability subject to change.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============ Sub-components ============

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 border border-border rounded-md p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function ContactBlock({ name, email, phone }: { name: string; email: string; phone?: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-foreground">{name}</p>
      <p className="text-sm text-muted-foreground">
        {email}{phone ? ` · ${phone}` : ''}
      </p>
    </div>
  );
}

function ChartBox({ title, data }: { title: string; data: Array<{ label: string; count: number; pct: number }> }) {
  return (
    <div className="bg-muted/50 border border-border rounded-md p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title}</p>
      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{item.label}</span>
            <div className="flex-1 h-3 bg-border rounded overflow-hidden">
              <div 
                className="h-full bg-primary rounded" 
                style={{ width: `${item.pct}%` }} 
              />
            </div>
            <span className="text-xs font-semibold text-foreground w-6 text-right">{item.count}</span>
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
    { min: 100000, max: 199999, label: '100–200K' },
    { min: 200000, max: 299999, label: '200–300K' },
    { min: 300000, max: 499999, label: '300–500K' },
    { min: 500000, max: Infinity, label: '500K+' },
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

  let immediate = 0;
  let sixToTwelve = 0;
  let twelvePlus = 0;
  let tbd = 0;

  for (const l of listings) {
    const av = (l.availability_date || '').toLowerCase().trim();
    if (!av || av === 'tbd' || av === 'unknown') {
      tbd++;
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
      } else {
        twelvePlus++;
      }
    } else {
      tbd++;
    }
  }

  const results = [
    { label: 'Immediate', count: immediate },
    { label: '6–12 Mo', count: sixToTwelve },
    { label: '12+ Mo', count: twelvePlus },
  ];

  if (tbd > 0) {
    results.push({ label: 'TBD', count: tbd });
  }

  const maxCount = Math.max(...results.map(r => r.count), 1);
  return results.filter(r => r.count > 0).map(r => ({
    ...r,
    pct: Math.round((r.count / maxCount) * 100),
  }));
}
