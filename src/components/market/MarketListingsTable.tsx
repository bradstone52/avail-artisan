import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MarketListing } from '@/hooks/useMarketListings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { StatusDropdown } from '@/components/market/StatusDropdown';
import { ExternalLink, MapPin, Pencil, Receipt } from 'lucide-react';
import { format } from 'date-fns';

interface MarketListingsTableProps {
  listings: MarketListing[];
  onEdit: (listing: MarketListing) => void;
  onRefresh: () => void;
}

function formatSF(sf: number | null): string {
  if (!sf) return '-';
  return sf.toLocaleString() + ' SF';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    return format(new Date(dateStr), 'MMM yyyy');
  } catch {
    return dateStr;
  }
}

function formatCurrency(value: string | null): string {
  if (!value) return '-';
  return value;
}

export function MarketListingsTable({ listings, onEdit, onRefresh }: MarketListingsTableProps) {
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Keyboard horizontal scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only respond if the container or table is focused or in view
      const activeElement = document.activeElement;
      const isInTable = container.contains(activeElement) || activeElement === document.body;
      
      if (!isInTable) return;

      const scrollAmount = 200;
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div 
      ref={scrollContainerRef}
      className="overflow-x-auto focus:outline-none"
      tabIndex={0}
      role="region"
      aria-label="Market listings table - use left and right arrow keys to scroll"
    >
      <Table className="min-w-[2400px]">
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">Address</TableHead>
            <TableHead className="min-w-[100px]">Listing ID</TableHead>
            <TableHead className="min-w-[120px]">Submarket</TableHead>
            <TableHead className="min-w-[100px]">City</TableHead>
            <TableHead className="min-w-[100px]">Status</TableHead>
            <TableHead className="min-w-[100px]">Type</TableHead>
            <TableHead className="text-right min-w-[100px]">Size (SF)</TableHead>
            <TableHead className="text-right min-w-[100px]">Warehouse SF</TableHead>
            <TableHead className="text-right min-w-[80px]">Office SF</TableHead>
            <TableHead className="text-right min-w-[80px]">Clear Height</TableHead>
            <TableHead className="text-right min-w-[80px]">Dock Doors</TableHead>
            <TableHead className="text-right min-w-[80px]">Drive-In</TableHead>
            <TableHead className="min-w-[100px]">Power (Amps)</TableHead>
            <TableHead className="min-w-[80px]">Voltage</TableHead>
            <TableHead className="min-w-[80px]">Sprinkler</TableHead>
            <TableHead className="min-w-[80px]">Cranes</TableHead>
            <TableHead className="min-w-[80px]">Crane Tons</TableHead>
            <TableHead className="min-w-[80px]">Yard</TableHead>
            <TableHead className="min-w-[100px]">Yard Area</TableHead>
            <TableHead className="min-w-[80px]">Cross-Dock</TableHead>
            <TableHead className="min-w-[100px]">Trailer Parking</TableHead>
            <TableHead className="min-w-[80px]">Land Acres</TableHead>
            <TableHead className="min-w-[80px]">Zoning</TableHead>
            <TableHead className="min-w-[80px]">MUA</TableHead>
            <TableHead className="min-w-[100px]">Asking Rate</TableHead>
            <TableHead className="min-w-[100px]">Gross Rate</TableHead>
            <TableHead className="min-w-[100px]">Op Costs</TableHead>
            <TableHead className="min-w-[100px]">Sale Price</TableHead>
            <TableHead className="min-w-[100px]">Sublease Exp</TableHead>
            <TableHead className="min-w-[100px]">Availability</TableHead>
            <TableHead className="min-w-[150px]">Landlord</TableHead>
            <TableHead className="min-w-[150px]">Broker</TableHead>
            <TableHead className="min-w-[80px]">Dist WH</TableHead>
            <TableHead className="min-w-[80px]">Geocoded</TableHead>
            <TableHead className="min-w-[80px]">Link</TableHead>
            <TableHead className="min-w-[200px]">Notes</TableHead>
            <TableHead className="sticky right-0 bg-background z-10 min-w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listings.map((listing) => (
            <TableRow key={listing.id}>
              {/* Address - Sticky */}
              <TableCell className="sticky left-0 bg-background z-10 font-medium max-w-[200px]">
                <div className="truncate" title={listing.address}>
                  {listing.display_address || listing.address}
                </div>
              </TableCell>
              
              {/* Listing ID */}
              <TableCell className="text-xs text-muted-foreground">
                {listing.listing_id}
              </TableCell>
              
              {/* Submarket */}
              <TableCell>{listing.submarket || '-'}</TableCell>
              
              {/* City */}
              <TableCell>{listing.city || '-'}</TableCell>
              
              {/* Status */}
              <TableCell>
                <StatusDropdown listing={listing} onStatusChanged={onRefresh} />
              </TableCell>
              
              {/* Type */}
              <TableCell className="text-sm text-muted-foreground">
                {listing.listing_type || '-'}
              </TableCell>
              
              {/* Size */}
              <TableCell className="text-right font-mono">
                {formatSF(listing.size_sf)}
              </TableCell>
              
              {/* Warehouse SF */}
              <TableCell className="text-right font-mono">
                {listing.warehouse_sf ? listing.warehouse_sf.toLocaleString() : '-'}
              </TableCell>
              
              {/* Office SF */}
              <TableCell className="text-right font-mono">
                {listing.office_sf ? listing.office_sf.toLocaleString() : '-'}
              </TableCell>
              
              {/* Clear Height */}
              <TableCell className="text-right">
                {listing.clear_height_ft ? `${listing.clear_height_ft}'` : '-'}
              </TableCell>
              
              {/* Dock Doors */}
              <TableCell className="text-right">
                {listing.dock_doors ?? '-'}
              </TableCell>
              
              {/* Drive-In Doors */}
              <TableCell className="text-right">
                {listing.drive_in_doors ?? '-'}
              </TableCell>
              
              {/* Power (Amps) */}
              <TableCell>{listing.power_amps || '-'}</TableCell>
              
              {/* Voltage */}
              <TableCell>{listing.voltage || '-'}</TableCell>
              
              {/* Sprinkler */}
              <TableCell>{listing.sprinkler || '-'}</TableCell>
              
              {/* Cranes */}
              <TableCell>{listing.cranes || '-'}</TableCell>
              
              {/* Crane Tons */}
              <TableCell>{listing.crane_tons || '-'}</TableCell>
              
              {/* Yard */}
              <TableCell>{listing.yard || '-'}</TableCell>
              
              {/* Yard Area */}
              <TableCell>{listing.yard_area || '-'}</TableCell>
              
              {/* Cross-Dock */}
              <TableCell>{listing.cross_dock || '-'}</TableCell>
              
              {/* Trailer Parking */}
              <TableCell>{listing.trailer_parking || '-'}</TableCell>
              
              {/* Land Acres */}
              <TableCell>{listing.land_acres || '-'}</TableCell>
              
              {/* Zoning */}
              <TableCell>{listing.zoning || '-'}</TableCell>
              
              {/* MUA */}
              <TableCell>{listing.mua || '-'}</TableCell>
              
              {/* Asking Rate */}
              <TableCell>{formatCurrency(listing.asking_rate_psf)}</TableCell>
              
              {/* Gross Rate */}
              <TableCell>{formatCurrency(listing.gross_rate)}</TableCell>
              
              {/* Op Costs */}
              <TableCell>{formatCurrency(listing.op_costs)}</TableCell>
              
              {/* Sale Price */}
              <TableCell>{formatCurrency(listing.sale_price)}</TableCell>
              
              {/* Sublease Exp */}
              <TableCell>{listing.sublease_exp || '-'}</TableCell>
              
              {/* Availability */}
              <TableCell>{formatDate(listing.availability_date)}</TableCell>
              
              {/* Landlord */}
              <TableCell className="max-w-[150px]">
                <div className="truncate" title={listing.landlord || ''}>
                  {listing.landlord || '-'}
                </div>
              </TableCell>
              
              {/* Broker */}
              <TableCell className="max-w-[150px]">
                <div className="truncate" title={listing.broker_source || ''}>
                  {listing.broker_source || '-'}
                </div>
              </TableCell>
              
              {/* Distribution Warehouse */}
              <TableCell>
                {listing.is_distribution_warehouse ? (
                  <Badge className="bg-primary/10 text-primary">Yes</Badge>
                ) : (
                  <span className="text-muted-foreground">No</span>
                )}
              </TableCell>
              
              {/* Geocoded */}
              <TableCell>
                {listing.latitude && listing.longitude ? (
                  <MapPin className="w-4 h-4 text-green-500" />
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              
              {/* Link */}
              <TableCell>
                {listing.link ? (
                  <a 
                    href={listing.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              
              {/* Notes */}
              <TableCell className="max-w-[200px]">
                <div className="truncate text-sm text-muted-foreground" title={listing.notes_public || ''}>
                  {listing.notes_public || '-'}
                </div>
              </TableCell>
              
              {/* Actions - Sticky */}
              <TableCell className="sticky right-0 bg-background z-10">
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(listing)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit Listing</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate(`/transactions/new?listing=${listing.id}`)}
                      >
                        <Receipt className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Log Transaction</TooltipContent>
                  </Tooltip>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
