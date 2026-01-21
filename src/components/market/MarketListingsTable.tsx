import { useRef, useEffect, useState } from 'react';
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
  return sf.toLocaleString();
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

function formatSalePrice(value: string | null): string {
  if (!value) return '-';
  // Parse the number and format as currency without decimals
  const numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
  if (isNaN(numValue)) return value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numValue);
}

function calculateGrossRate(askRate: string | null, opCosts: string | null): string {
  if (!askRate || !opCosts) return '-';
  
  // Parse numeric values
  const askNum = parseFloat(askRate.replace(/[^0-9.-]/g, ''));
  const opNum = parseFloat(opCosts.replace(/[^0-9.-]/g, ''));
  
  if (isNaN(askNum) || isNaN(opNum)) return '-';
  
  const gross = askNum + opNum;
  return `$${gross.toFixed(2)}`;
}

export function MarketListingsTable({ listings, onEdit, onRefresh }: MarketListingsTableProps) {
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Keyboard horizontal scroll - works when hovering over the table
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only respond when mouse is over the table area
      if (!isHovered) return;

      const scrollAmount = 300;
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      } else if (e.key === 'Escape') {
        setSelectedRowId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHovered]);

  return (
    <div 
      ref={scrollContainerRef}
      className="overflow-x-auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="region"
      aria-label="Market listings table - use left and right arrow keys to scroll"
    >
      <Table className="min-w-[3000px]">
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-20 min-w-[180px] bg-muted text-foreground shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">Address</TableHead>
            <TableHead className="min-w-[130px]">Submarket</TableHead>
            <TableHead className="min-w-[100px]">City</TableHead>
            <TableHead className="min-w-[130px]">Status</TableHead>
            <TableHead className="min-w-[80px]">Type</TableHead>
            <TableHead className="text-right min-w-[100px]">Size (SF)</TableHead>
            <TableHead className="text-right min-w-[110px]">Warehouse SF</TableHead>
            <TableHead className="text-right min-w-[90px]">Office SF</TableHead>
            <TableHead className="text-right min-w-[90px]">Clear Ht</TableHead>
            <TableHead className="text-right min-w-[70px]">Docks</TableHead>
            <TableHead className="text-right min-w-[70px]">Drive-In</TableHead>
            <TableHead className="min-w-[90px]">Power</TableHead>
            <TableHead className="min-w-[80px]">Voltage</TableHead>
            <TableHead className="min-w-[90px]">Sprinkler</TableHead>
            <TableHead className="min-w-[70px]">Cranes</TableHead>
            <TableHead className="min-w-[80px]">Crane T</TableHead>
            <TableHead className="min-w-[60px]">Yard</TableHead>
            <TableHead className="min-w-[90px]">Yard Area</TableHead>
            <TableHead className="min-w-[80px]">X-Dock</TableHead>
            <TableHead className="min-w-[90px]">Trailer</TableHead>
            <TableHead className="min-w-[80px]">Acres</TableHead>
            <TableHead className="min-w-[80px]">Zoning</TableHead>
            <TableHead className="min-w-[60px]">MUA</TableHead>
            <TableHead className="min-w-[90px]">Ask Rate</TableHead>
            <TableHead className="min-w-[80px]">Op Cost</TableHead>
            <TableHead className="min-w-[90px]">Gross</TableHead>
            <TableHead className="min-w-[100px]">Sale Price</TableHead>
            <TableHead className="min-w-[90px]">Sub Exp</TableHead>
            <TableHead className="min-w-[90px]">Avail</TableHead>
            <TableHead className="min-w-[140px]">Landlord</TableHead>
            <TableHead className="min-w-[140px]">Broker</TableHead>
            <TableHead className="min-w-[60px]">DW</TableHead>
            <TableHead className="min-w-[50px]">Geo</TableHead>
            <TableHead className="min-w-[50px]">Link</TableHead>
            <TableHead className="min-w-[180px]">Notes</TableHead>
            <TableHead className="sticky right-0 z-20 min-w-[90px] bg-muted text-foreground shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.15)]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listings.map((listing) => {
            const isSelected = selectedRowId === listing.id;
            return (
            <TableRow 
              key={listing.id} 
              className={`cursor-pointer transition-colors ${
                isSelected 
                  ? '!bg-amber-200 dark:!bg-amber-700 hover:!bg-amber-300 dark:hover:!bg-amber-600' 
                  : 'hover:bg-muted/30'
              }`}
              onClick={() => setSelectedRowId(isSelected ? null : listing.id)}
            >
              {/* Address - Sticky */}
              <TableCell className={`sticky left-0 z-10 font-medium shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)] ${
                isSelected ? 'bg-amber-200 dark:bg-amber-700' : 'bg-background'
              }`}>
                <div className="truncate max-w-[170px]" title={listing.address}>
                  {listing.display_address || listing.address}
                </div>
              </TableCell>
              
              {/* Submarket */}
              <TableCell className="text-sm">{listing.submarket || '-'}</TableCell>
              
              {/* City */}
              <TableCell className="text-sm">{listing.city || '-'}</TableCell>
              
              {/* Status */}
              <TableCell>
                <StatusDropdown listing={listing} onStatusChanged={onRefresh} />
              </TableCell>
              
              {/* Type */}
              <TableCell className="text-sm">{listing.listing_type || '-'}</TableCell>
              
              {/* Size */}
              <TableCell className="text-right font-mono text-sm">
                {formatSF(listing.size_sf)}
              </TableCell>
              
              {/* Warehouse SF */}
              <TableCell className="text-right font-mono text-sm">
                {listing.warehouse_sf ? listing.warehouse_sf.toLocaleString() : '-'}
              </TableCell>
              
              {/* Office SF */}
              <TableCell className="text-right font-mono text-sm">
                {listing.office_sf ? listing.office_sf.toLocaleString() : '-'}
              </TableCell>
              
              {/* Clear Height */}
              <TableCell className="text-right text-sm">
                {listing.clear_height_ft ? `${listing.clear_height_ft}'` : '-'}
              </TableCell>
              
              {/* Dock Doors */}
              <TableCell className="text-right text-sm">
                {listing.dock_doors ?? '-'}
              </TableCell>
              
              {/* Drive-In Doors */}
              <TableCell className="text-right text-sm">
                {listing.drive_in_doors ?? '-'}
              </TableCell>
              
              {/* Power (Amps) */}
              <TableCell className="text-sm">{listing.power_amps || '-'}</TableCell>
              
              {/* Voltage */}
              <TableCell className="text-sm">{listing.voltage || '-'}</TableCell>
              
              {/* Sprinkler */}
              <TableCell className="text-sm">{listing.sprinkler || '-'}</TableCell>
              
              {/* Cranes */}
              <TableCell className="text-sm">{listing.cranes || '-'}</TableCell>
              
              {/* Crane Tons */}
              <TableCell className="text-sm">{listing.crane_tons || '-'}</TableCell>
              
              {/* Yard */}
              <TableCell className="text-sm">{listing.yard || '-'}</TableCell>
              
              {/* Yard Area */}
              <TableCell className="text-sm">{listing.yard_area || '-'}</TableCell>
              
              {/* Cross-Dock */}
              <TableCell className="text-sm">{listing.cross_dock || '-'}</TableCell>
              
              {/* Trailer Parking */}
              <TableCell className="text-sm">{listing.trailer_parking || '-'}</TableCell>
              
              {/* Land Acres */}
              <TableCell className="text-sm">{listing.land_acres || '-'}</TableCell>
              
              {/* Zoning */}
              <TableCell className="text-sm">{listing.zoning || '-'}</TableCell>
              
              {/* MUA */}
              <TableCell className="text-sm">{listing.mua || '-'}</TableCell>
              
              {/* Asking Rate */}
              <TableCell className="text-sm">{formatCurrency(listing.asking_rate_psf)}</TableCell>
              
              {/* Op Costs */}
              <TableCell className="text-sm">{formatCurrency(listing.op_costs)}</TableCell>
              
              {/* Gross Rate - Calculated from Ask + Op Cost */}
              <TableCell className="text-sm">{calculateGrossRate(listing.asking_rate_psf, listing.op_costs)}</TableCell>
              
              {/* Sale Price - Currency formatted */}
              <TableCell className="text-sm">{formatSalePrice(listing.sale_price)}</TableCell>
              
              {/* Sublease Exp */}
              <TableCell className="text-sm">{listing.sublease_exp || '-'}</TableCell>
              
              {/* Availability */}
              <TableCell className="text-sm">{formatDate(listing.availability_date)}</TableCell>
              
              {/* Landlord */}
              <TableCell>
                <div className="truncate max-w-[130px] text-sm" title={listing.landlord || ''}>
                  {listing.landlord || '-'}
                </div>
              </TableCell>
              
              {/* Broker */}
              <TableCell>
                <div className="truncate max-w-[130px] text-sm" title={listing.broker_source || ''}>
                  {listing.broker_source || '-'}
                </div>
              </TableCell>
              
              {/* Distribution Warehouse */}
              <TableCell>
                {listing.is_distribution_warehouse ? (
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">Y</Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              
              {/* Geocoded */}
              <TableCell>
                {listing.latitude && listing.longitude ? (
                  <MapPin className="w-4 h-4 text-green-600" />
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              
              {/* Link */}
              <TableCell>
                {listing.link ? (
                  <a 
                    href={listing.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-primary hover:text-primary/80"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              
              {/* Notes */}
              <TableCell>
                <div className="truncate max-w-[170px] text-sm text-muted-foreground" title={listing.notes_public || ''}>
                  {listing.notes_public || '-'}
                </div>
              </TableCell>
              
              {/* Actions - Sticky */}
              <TableCell className={`sticky right-0 z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.15)] ${
                isSelected ? 'bg-amber-200 dark:bg-amber-700' : 'bg-background'
              }`}>
                <div className="flex items-center gap-0.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); onEdit(listing); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit Listing</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); navigate(`/transactions/new?listing=${listing.id}`); }}
                      >
                        <Receipt className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Log Transaction</TooltipContent>
                  </Tooltip>
                </div>
              </TableCell>
            </TableRow>
          );})}
        </TableBody>
      </Table>
    </div>
  );
}
