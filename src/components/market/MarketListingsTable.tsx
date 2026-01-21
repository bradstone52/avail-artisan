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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusDropdown } from '@/components/market/StatusDropdown';
import { EditMarketPinDialog } from '@/components/market/EditMarketPinDialog';
import { ExternalLink, MapPin, MapPinOff, Hand, Pencil, Receipt, RotateCcw, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type SortDirection = 'asc' | 'desc' | null;
export type SortableColumn = 'size_sf' | 'warehouse_sf' | 'office_sf' | 'dock_doors' | 'drive_in_doors' | 'power_amps';

interface MarketListingsTableProps {
  listings: MarketListing[];
  onEdit: (listing: MarketListing) => void;
  onRefresh: () => void;
  sortColumn: SortableColumn | null;
  sortDirection: SortDirection;
  onSort: (column: SortableColumn) => void;
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

export function MarketListingsTable({ listings, onEdit, onRefresh, sortColumn, sortDirection, onSort }: MarketListingsTableProps) {
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [updatingDW, setUpdatingDW] = useState<string | null>(null);
  const [editPinListing, setEditPinListing] = useState<MarketListing | null>(null);

  // Reset pin to auto-geocode
  const handleResetPin = async (listing: MarketListing) => {
    try {
      const { error } = await supabase
        .from('market_listings')
        .update({
          latitude: null,
          longitude: null,
          geocode_source: null,
          geocoded_at: null,
        })
        .eq('id', listing.id);
      
      if (error) throw error;
      toast.success('Pin reset - will be auto-geocoded on next sync');
      onRefresh();
    } catch (err) {
      console.error('Failed to reset pin:', err);
      toast.error('Failed to reset pin location');
    }
  };

  // Toggle distribution warehouse flag
  const handleToggleDW = async (listing: MarketListing) => {
    setUpdatingDW(listing.id);
    try {
      const newValue = !listing.is_distribution_warehouse;
      const { error } = await supabase
        .from('market_listings')
        .update({ is_distribution_warehouse: newValue, updated_at: new Date().toISOString() })
        .eq('id', listing.id);

      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error('Error updating DW flag:', err);
      toast.error('Failed to update');
    } finally {
      setUpdatingDW(null);
    }
  };

  // Sortable header component
  const SortableHeader = ({ column, children, className = '' }: { column: SortableColumn; children: React.ReactNode; className?: string }) => {
    const isActive = sortColumn === column;
    return (
      <TableHead 
        className={`text-background cursor-pointer select-none hover:bg-zinc-600 transition-colors ${className}`}
        onClick={() => onSort(column)}
      >
        <div className="flex items-center gap-1">
          {children}
          {isActive && sortDirection === 'asc' && <ArrowUp className="h-3 w-3" />}
          {isActive && sortDirection === 'desc' && <ArrowDown className="h-3 w-3" />}
          {!isActive && <ArrowUpDown className="h-3 w-3 opacity-40" />}
        </div>
      </TableHead>
    );
  };

  // Smooth keyboard horizontal scroll - trackpad-like experience
  useEffect(() => {
    let animationId: number | null = null;
    let scrollDirection = 0; // -1 for left, 1 for right, 0 for stopped
    let velocity = 0;
    let lastTime = performance.now();
    
    const maxVelocity = 15; // pixels per frame at max speed
    const acceleration = 0.12; // how quickly we reach max speed
    const deceleration = 0.92; // how quickly we slow down

    const animate = (currentTime: number) => {
      // Calculate delta time for frame-rate independent animation
      const deltaTime = Math.min((currentTime - lastTime) / 8.33, 3); // normalize to ~120fps, cap at 3x
      lastTime = currentTime;

      const container = scrollContainerRef.current?.querySelector('.overflow-auto, [class*="overflow-auto"]') as HTMLElement;
      if (!container) {
        animationId = requestAnimationFrame(animate);
        return;
      }

      // Accelerate towards target velocity or decelerate to stop
      if (scrollDirection !== 0) {
        velocity += (scrollDirection * maxVelocity - velocity) * acceleration * deltaTime;
      } else {
        velocity *= Math.pow(deceleration, deltaTime);
      }

      // Apply scroll if there's meaningful velocity
      if (Math.abs(velocity) > 0.1) {
        container.scrollBy({ left: velocity * deltaTime, behavior: 'auto' });
      }

      animationId = requestAnimationFrame(animate);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isHovered) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollDirection = -1;
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        scrollDirection = 1;
      } else if (e.key === 'Escape') {
        setSelectedRowId(null);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        scrollDirection = 0;
      }
    };

    // Start animation loop
    animationId = requestAnimationFrame(animate);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isHovered]);

  return (
    <div 
      ref={scrollContainerRef}
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="region"
      aria-label="Market listings table - use left and right arrow keys to scroll"
    >
      {/* Keyboard scroll indicator */}
      {isHovered && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-primary text-primary-foreground text-sm font-black uppercase tracking-widest rounded-none border-3 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))] animate-pulse">
          ⌨️ ← → SCROLL
        </div>
      )}
      <Table className="min-w-[3000px]">
        <TableHeader>
          <TableRow className="bg-foreground">
            <TableHead className="sticky left-0 z-20 min-w-[180px] bg-zinc-700 dark:bg-zinc-600 text-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">Address</TableHead>
            <TableHead className="text-background min-w-[130px]">Submarket</TableHead>
            <TableHead className="text-background min-w-[100px]">City</TableHead>
            <TableHead className="text-background min-w-[80px]">Type</TableHead>
            <SortableHeader column="size_sf" className="text-right min-w-[100px]">Size (SF)</SortableHeader>
            <SortableHeader column="warehouse_sf" className="text-right min-w-[110px]">Warehouse SF</SortableHeader>
            <SortableHeader column="office_sf" className="text-right min-w-[90px]">Office SF</SortableHeader>
            <TableHead className="text-background text-right min-w-[90px]">Clear Ht</TableHead>
            <SortableHeader column="dock_doors" className="text-right min-w-[70px]">Docks</SortableHeader>
            <SortableHeader column="drive_in_doors" className="text-right min-w-[70px]">Drive-In</SortableHeader>
            <SortableHeader column="power_amps" className="min-w-[90px]">Power</SortableHeader>
            <TableHead className="text-background min-w-[80px]">Voltage</TableHead>
            <TableHead className="text-background min-w-[90px]">Sprinkler</TableHead>
            <TableHead className="text-background min-w-[70px]">Cranes</TableHead>
            <TableHead className="text-background min-w-[80px]">Crane T</TableHead>
            <TableHead className="text-background min-w-[60px]">Yard</TableHead>
            <TableHead className="text-background min-w-[90px]">Yard Area</TableHead>
            <TableHead className="text-background min-w-[80px]">X-Dock</TableHead>
            <TableHead className="text-background min-w-[90px]">Trailer</TableHead>
            <TableHead className="text-background min-w-[80px]">Acres</TableHead>
            <TableHead className="text-background min-w-[80px]">Zoning</TableHead>
            <TableHead className="text-background min-w-[60px]">MUA</TableHead>
            <TableHead className="text-background min-w-[90px]">Ask Rate</TableHead>
            <TableHead className="text-background min-w-[80px]">Op Cost</TableHead>
            <TableHead className="text-background min-w-[90px]">Gross</TableHead>
            <TableHead className="text-background min-w-[100px]">Sale Price</TableHead>
            <TableHead className="text-background min-w-[90px]">Sub Exp</TableHead>
            <TableHead className="text-background min-w-[90px]">Avail</TableHead>
            <TableHead className="text-background min-w-[140px]">Landlord</TableHead>
            <TableHead className="text-background min-w-[140px]">Brokerage</TableHead>
            <TableHead className="text-background min-w-[60px]">DW</TableHead>
            <TableHead className="text-background min-w-[50px]">Geo</TableHead>
            <TableHead className="text-background min-w-[50px]">Link</TableHead>
            <TableHead className="text-background min-w-[180px]">Notes</TableHead>
            <TableHead className="text-background min-w-[130px]">Status</TableHead>
            <TableHead className="sticky right-0 z-20 min-w-[90px] bg-zinc-700 dark:bg-zinc-600 text-background shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.3)]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listings.map((listing, index) => {
            const isSelected = selectedRowId === listing.id;
            const isEvenRow = index % 2 === 1;
            // Sticky columns match the rest of the table's striping
            const stickyBg = isSelected 
              ? 'bg-secondary' 
              : isEvenRow 
                ? 'bg-table-stripe' 
                : 'bg-card';
            // Pink hover - darker on striped rows to blend
            const hoverClass = isSelected 
              ? 'hover:!bg-secondary/90' 
              : isEvenRow
                ? 'hover:!bg-pink-300 dark:hover:!bg-pink-800'
                : 'hover:!bg-pink-200 dark:hover:!bg-pink-900/50';
            // Sticky hover matches
            const stickyHoverClass = isSelected
              ? ''
              : isEvenRow
                ? 'group-hover:!bg-pink-300 dark:group-hover:!bg-pink-800'
                : 'group-hover:!bg-pink-200 dark:group-hover:!bg-pink-900/50';
            // Neo-brutalist border styling - using outline for full border that doesn't conflict with adjacent rows
            const outlineClass = isSelected
              ? 'outline outline-2 outline-amber-600 dark:outline-amber-500 -outline-offset-1'
              : 'outline-0 hover:outline hover:outline-2 hover:outline-pink-500 dark:hover:outline-pink-400 hover:-outline-offset-1';
            return (
            <TableRow 
              key={listing.id} 
              className={`group cursor-pointer transition-all !border-b-2 !border-foreground ${hoverClass} ${outlineClass} ${
                isSelected ? '!bg-secondary' : ''
              }`}
              onClick={() => setSelectedRowId(isSelected ? null : listing.id)}
            >
              {/* Address - Sticky with grey right border */}
              <TableCell className={`sticky left-0 z-10 font-medium border-r border-gray-300 dark:border-gray-600 transition-colors ${stickyBg} ${stickyHoverClass}`}>
                <div className="truncate max-w-[170px]" title={listing.address}>
                  {listing.display_address || listing.address}
                </div>
              </TableCell>
              
              {/* Submarket */}
              <TableCell className="text-sm">{listing.submarket || '-'}</TableCell>
              
              {/* City */}
              <TableCell className="text-sm">{listing.city || '-'}</TableCell>
              
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
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleDW(listing);
                  }}
                  disabled={updatingDW === listing.id}
                  className={`px-2 py-1 text-xs font-bold uppercase border-2 border-foreground transition-all disabled:opacity-50 ${
                    listing.is_distribution_warehouse 
                      ? 'bg-primary text-primary-foreground shadow-[2px_2px_0_hsl(var(--foreground))]' 
                      : 'bg-destructive text-destructive-foreground shadow-[2px_2px_0_hsl(var(--foreground))]'
                  }`}
                  style={{ borderRadius: 'var(--radius)' }}
                >
                  {listing.is_distribution_warehouse ? 'Y' : 'N'}
                </button>
              </TableCell>
              
              {/* Geocoded - with edit functionality */}
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn(
                        "h-8 w-8 relative",
                        listing.geocode_source === 'manual' && "ring-2 ring-warning ring-offset-1"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {listing.latitude && listing.longitude ? (
                        <>
                          <MapPin className={cn(
                            "w-4 h-4",
                            listing.geocode_source === 'manual' ? "text-warning" : "text-green-600"
                          )} />
                          {listing.geocode_source === 'manual' && (
                            <Hand className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5 text-warning" />
                          )}
                        </>
                      ) : (
                        <MapPinOff className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditPinListing(listing); }}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit pin location
                    </DropdownMenuItem>
                    {listing.geocode_source === 'manual' && (
                      <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); handleResetPin(listing); }}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset to auto-geocode
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
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
              
              {/* Status - Near end since most are Active until transaction */}
              <TableCell>
                <StatusDropdown listing={listing} onStatusChanged={onRefresh} />
              </TableCell>
              
              {/* Actions - Sticky with grey left border */}
              <TableCell className={`sticky right-0 z-10 border-l border-gray-300 dark:border-gray-600 transition-colors ${stickyBg} ${stickyHoverClass}`}>
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

      {/* Edit Pin Location Dialog */}
      <EditMarketPinDialog
        listing={editPinListing}
        open={editPinListing !== null}
        onOpenChange={(open) => {
          if (!open) setEditPinListing(null);
        }}
        onSave={() => {
          setEditPinListing(null);
          onRefresh();
        }}
      />
    </div>
  );
}
