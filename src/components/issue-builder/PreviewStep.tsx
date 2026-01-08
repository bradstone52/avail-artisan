import { Listing, IssueSettings } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Building2, MapPin, Calendar, DollarSign, Truck, Box } from 'lucide-react';

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
  const issueTitle = settings.title || `Large-Format Distribution Availability — ${format(new Date(), 'MMMM yyyy')}`;
  
  const newCount = Object.values(changeStatus).filter(s => s === 'new').length;
  const changedCount = Object.values(changeStatus).filter(s => s === 'changed').length;
  
  // Find earliest availability
  const availabilities = selectedListings
    .map(l => l.availability_date)
    .filter(Boolean)
    .sort();
  const earliestAvailability = availabilities[0] || 'TBD';
  
  // Size range
  const sizes = selectedListings.map(l => l.size_sf);
  const minSize = Math.min(...sizes);
  const maxSize = Math.max(...sizes);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-display font-semibold mb-1">Preview</h2>
        <p className="text-muted-foreground text-sm">
          Review your distribution snapshot before generating the PDF
        </p>
      </div>

      {/* PDF Preview Container */}
      <div className="border border-border rounded-xl overflow-hidden bg-white shadow-lg">
        {/* Cover Page */}
        <div className="p-8 bg-gradient-to-br from-primary/5 to-primary/10 border-b border-border">
          <div className="max-w-2xl">
            {settings.logoUrl && (
              <img 
                src={settings.logoUrl} 
                alt="Logo" 
                className="h-10 mb-6 object-contain"
              />
            )}
            <h1 className="text-3xl font-display font-bold text-foreground mb-3">
              {issueTitle}
            </h1>
            <p className="text-lg text-muted-foreground mb-4">
              Curated snapshot of logistics-capable space in {settings.market}
            </p>
            <p className="text-sm text-muted-foreground">
              Published {format(new Date(), 'MMMM d, yyyy')}
            </p>
            
            {/* Market Signal */}
            <div className="mt-6 p-4 bg-card rounded-lg border border-border">
              <p className="text-sm">
                <strong>{selectedListings.length} spaces</strong> above{' '}
                {settings.sizeThreshold.toLocaleString()} SF are currently tracked.
                Earliest availability is <strong>{earliestAvailability}</strong>.
                {newCount > 0 && ` New this month: ${newCount}.`}
              </p>
            </div>
          </div>
        </div>

        {/* Market Snapshot */}
        <div className="p-8 border-b border-border">
          <h2 className="text-xl font-display font-semibold mb-4">Market Snapshot</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-display font-bold">{selectedListings.length}</p>
              <p className="text-xs text-muted-foreground">Total Tracked</p>
            </div>
            <div className="p-4 bg-badge-new/10 rounded-lg text-center">
              <p className="text-2xl font-display font-bold text-success">{newCount}</p>
              <p className="text-xs text-muted-foreground">New</p>
            </div>
            <div className="p-4 bg-badge-changed/10 rounded-lg text-center">
              <p className="text-2xl font-display font-bold text-warning">{changedCount}</p>
              <p className="text-xs text-muted-foreground">Changed</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-lg font-display font-bold">
                {minSize.toLocaleString()}–{maxSize.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Size Range (SF)</p>
            </div>
          </div>
        </div>

        {/* Property Cards Preview (first 4) */}
        <div className="p-8">
          <h2 className="text-xl font-display font-semibold mb-4">Properties</h2>
          <div className="grid gap-4">
            {selectedListings.slice(0, 4).map(listing => (
              <div 
                key={listing.id}
                className="border border-border rounded-lg p-5 hover:border-primary/30 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-semibold">
                        {listing.property_name || listing.address}
                      </h3>
                      {changeStatus[listing.id] === 'new' && (
                        <Badge className="bg-badge-new text-badge-new-foreground">NEW</Badge>
                      )}
                      {changeStatus[listing.id] === 'changed' && (
                        <Badge className="bg-badge-changed text-badge-changed-foreground">CHANGED</Badge>
                      )}
                    </div>
                    {listing.property_name && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {listing.address}, {listing.city}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="flex-shrink-0">
                    {listing.submarket}
                  </Badge>
                </div>

                {/* Key Facts Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Box className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{listing.size_sf.toLocaleString()} SF</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Clear:</span>
                    <span className="font-medium">
                      {listing.clear_height_ft ? `${listing.clear_height_ft}'` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{listing.dock_doors} docks</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{listing.availability_date || 'TBD'}</span>
                  </div>
                </div>

                {/* Executive Note */}
                <p className="text-sm text-muted-foreground">
                  {executiveNotes[listing.id] || 'Details available on request.'}
                </p>

                {/* Contact */}
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Details / tours: {settings.primaryContactName || 'Contact us'} 
                    {settings.primaryContactEmail && ` — ${settings.primaryContactEmail}`}
                    {settings.primaryContactPhone && ` — ${settings.primaryContactPhone}`}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {selectedListings.length > 4 && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              + {selectedListings.length - 4} more properties in full PDF
            </p>
          )}
        </div>

        {/* Footer Preview */}
        <div className="p-8 bg-muted/30 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Information believed reliable but not guaranteed. Rates/availability subject to change.
          </p>
        </div>
      </div>
    </div>
  );
}
