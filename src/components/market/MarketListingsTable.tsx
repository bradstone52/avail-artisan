import { useRef, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MarketListing } from '@/hooks/useMarketListings';
import { useAuth } from '@/contexts/AuthContext';
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
import { LogTransactionDialog } from '@/components/market/LogTransactionDialog';
import { ExternalLink, MapPin, MapPinOff, Hand, Pencil, Receipt, RotateCcw, ArrowUp, ArrowDown, ArrowUpDown, CheckCircle } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatSubmarket } from '@/lib/formatters';

export type SortDirection = 'asc' | 'desc' | null;
export type SortableColumn = 'size_sf' | 'warehouse_sf' | 'office_sf' | 'dock_doors' | 'drive_in_doors' | 'power_amps' | 'last_verified_date';

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
  const { session } = useAuth();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [updatingDW, setUpdatingDW] = useState<string | null>(null);
  const [updatingLand, setUpdatingLand] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [geocodingId, setGeocodingId] = useState<string | null>(null);
  const [editPinListing, setEditPinListing] = useState<MarketListing | null>(null);
  const [transactionListing, setTransactionListing] = useState<MarketListing | null>(null);

  // Persist horizontal scroll so returning to the tab (or any remount) doesn't snap back to the left.
  // Note: the actual scrollable element is created inside the shadcn <Table /> wrapper.
  const scrollStorageKey = useMemo(() => {
    // If you want per-page persistence, include page/filter state here.
    // For now, keep it stable for the market listings table.
    return 'market_listings_table_scroll_left_v1';
  }, []);

  const getScrollEl = () => {
    return scrollContainerRef.current?.querySelector(
      '.overflow-auto, [class*="overflow-auto"]'
    ) as HTMLElement | null;
  };

  useEffect(() => {
    const el = getScrollEl();
    if (!el) return;

    const saved = sessionStorage.getItem(scrollStorageKey);
    if (saved) {
      const next = Number(saved);
      if (Number.isFinite(next)) {
        // rAF so layout is ready (table width computed) before applying scrollLeft.
        requestAnimationFrame(() => {
          const el2 = getScrollEl();
          if (el2) el2.scrollLeft = next;
        });
      }
    }

    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        sessionStorage.setItem(scrollStorageKey, String(el.scrollLeft));
      });
    };

    el.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      el.removeEventListener('scroll', onScroll);
      // Ensure we store one last time on unmount
      sessionStorage.setItem(scrollStorageKey, String(el.scrollLeft));
    };
  }, [scrollStorageKey]);

  // Check if listing is stale (not verified in past 30 days)
  const isStale = (listing: MarketListing): boolean => {
    if (!listing.last_verified_date) return true;
    try {
      const verifiedDate = parseISO(listing.last_verified_date);
      return differenceInDays(new Date(), verifiedDate) > 30;
    } catch {
      return true;
    }
  };

  // Mark listing as verified today
  const handleVerify = async (listing: MarketListing) => {
    setVerifyingId(listing.id);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { error } = await supabase
        .from('market_listings')
        .update({ last_verified_date: today, updated_at: new Date().toISOString() })
        .eq('id', listing.id);

      if (error) throw error;
      toast.success('Listing verified');
      onRefresh();
    } catch (err) {
      console.error('Failed to verify listing:', err);
      toast.error('Failed to verify listing');
    } finally {
      setVerifyingId(null);
    }
  };

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
      toast.success('Pin reset — use Auto-geocode to regenerate');
      onRefresh();
    } catch (err) {
      console.error('Failed to reset pin:', err);
      toast.error('Failed to reset pin location');
    }
  };

  const handleAutoGeocode = async (listing: MarketListing) => {
    const accessToken = session?.access_token;
    if (!accessToken) {
      toast.error('Not authenticated');
      return;
    }

    setGeocodingId(listing.id);
    try {
      const { data, error } = await supabase.functions.invoke('geocode-market-listing', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: { listingId: listing.listing_id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.geocoded) {
        toast.success('Geocode updated');
      } else {
        toast.message(data?.message || 'No changes');
      }

      onRefresh();
    } catch (err) {
      console.error('Failed to auto-geocode:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to auto-geocode');
    } finally {
      setGeocodingId(null);
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

  // Toggle land flag
  const handleToggleLand = async (listing: MarketListing) => {
    setUpdatingLand(listing.id);
    try {
      const newValue = !listing.has_land;
      const { error } = await supabase
        .from('market_listings')
        .update({ has_land: newValue, updated_at: new Date().toISOString() })
        .eq('id', listing.id);

      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error('Error updating Land flag:', err);
      toast.error('Failed to update');
    } finally {
      setUpdatingLand(null);
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

      const container = getScrollEl();
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
        <TableHeader className="sticky top-0 z-10">
          <TableRow className="bg-foreground">
            <TableHead className="sticky left-0 z-30 min-w-[180px] bg-zinc-700 dark:bg-zinc-600 text-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">Address</TableHead>
            <TableHead className="text-background min-w-[130px] bg-zinc-700 dark:bg-zinc-600">Submarket</TableHead>
            <TableHead className="text-background min-w-[100px] bg-zinc-700 dark:bg-zinc-600">City</TableHead>
            <TableHead className="text-background min-w-[80px] bg-zinc-700 dark:bg-zinc-600">Type</TableHead>
            <TableHead className="text-background min-w-[60px] bg-zinc-700 dark:bg-zinc-600">DW</TableHead>
            <SortableHeader column="size_sf" className="text-right min-w-[100px] bg-zinc-700 dark:bg-zinc-600">Size (SF)</SortableHeader>
            <SortableHeader column="warehouse_sf" className="text-right min-w-[110px] bg-zinc-700 dark:bg-zinc-600">Warehouse SF</SortableHeader>
            <SortableHeader column="office_sf" className="text-right min-w-[90px] bg-zinc-700 dark:bg-zinc-600">Office SF</SortableHeader>
            <TableHead className="text-background text-right min-w-[90px] bg-zinc-700 dark:bg-zinc-600">Clear Ht</TableHead>
            <SortableHeader column="dock_doors" className="text-right min-w-[70px] bg-zinc-700 dark:bg-zinc-600">Docks</SortableHeader>
            <SortableHeader column="drive_in_doors" className="text-right min-w-[70px] bg-zinc-700 dark:bg-zinc-600">Drive-In</SortableHeader>
            <SortableHeader column="power_amps" className="min-w-[110px] bg-zinc-700 dark:bg-zinc-600">Power</SortableHeader>
            <TableHead className="text-background min-w-[90px] bg-zinc-700 dark:bg-zinc-600">Sprinkler</TableHead>
            <TableHead className="text-background min-w-[70px] bg-zinc-700 dark:bg-zinc-600">Cranes</TableHead>
            <TableHead className="text-background min-w-[60px] bg-zinc-700 dark:bg-zinc-600">Yard</TableHead>
            <TableHead className="text-background min-w-[90px] bg-zinc-700 dark:bg-zinc-600">Yard Area</TableHead>
            <TableHead className="text-background min-w-[80px] bg-zinc-700 dark:bg-zinc-600">X-Dock</TableHead>
            <TableHead className="text-background min-w-[90px] bg-zinc-700 dark:bg-zinc-600">Trailer</TableHead>
            <TableHead className="text-background min-w-[80px] bg-zinc-700 dark:bg-zinc-600">Acres</TableHead>
            <TableHead className="text-background min-w-[80px] bg-zinc-700 dark:bg-zinc-600">Zoning</TableHead>
            <TableHead className="text-background min-w-[60px] bg-zinc-700 dark:bg-zinc-600">MUA</TableHead>
            <TableHead className="text-background min-w-[90px] bg-zinc-700 dark:bg-zinc-600">Ask Rate</TableHead>
            <TableHead className="text-background min-w-[80px] bg-zinc-700 dark:bg-zinc-600">Op Cost</TableHead>
            <TableHead className="text-background min-w-[90px] bg-zinc-700 dark:bg-zinc-600">Gross</TableHead>
            <TableHead className="text-background min-w-[100px] bg-zinc-700 dark:bg-zinc-600">Sale Price</TableHead>
            <TableHead className="text-background min-w-[90px] bg-zinc-700 dark:bg-zinc-600">Sub Exp</TableHead>
            <TableHead className="text-background min-w-[90px] bg-zinc-700 dark:bg-zinc-600">Avail</TableHead>
            <TableHead className="text-background min-w-[140px] bg-zinc-700 dark:bg-zinc-600">Landlord</TableHead>
            <TableHead className="text-background min-w-[140px] bg-zinc-700 dark:bg-zinc-600">Brokerage</TableHead>
            <TableHead className="text-background min-w-[180px] bg-zinc-700 dark:bg-zinc-600">Notes</TableHead>
            <TableHead className="text-background min-w-[130px] bg-zinc-700 dark:bg-zinc-600">Status</TableHead>
            <SortableHeader column="last_verified_date" className="min-w-[100px] bg-zinc-700 dark:bg-zinc-600">Verified</SortableHeader>
            <TableHead className="text-background min-w-[60px] bg-zinc-700 dark:bg-zinc-600">Land</TableHead>
            <TableHead className="sticky right-0 z-30 min-w-[160px] bg-zinc-700 dark:bg-zinc-600 text-background shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.3)]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listings.map((listing, index) => {
            const isSelected = selectedRowId === listing.id;
            const isEvenRow = index % 2 === 1;
            const stale = isStale(listing);
            // Stale styling - bold red background for unverified listings
            const staleRowBg = stale ? 'bg-red-700 dark:bg-red-800' : '';
            const staleTextClass = stale ? 'text-white' : '';
            // Sticky columns match the rest of the table's striping
            const stickyBg = isSelected 
              ? 'bg-secondary' 
              : stale
                ? 'bg-red-700 dark:bg-red-800'
                : isEvenRow 
                  ? 'bg-table-stripe' 
                  : 'bg-card';
            // Pink hover - darker on striped rows to blend (override stale on hover)
            const hoverClass = isSelected 
              ? 'hover:!bg-secondary/90' 
              : stale
                ? 'hover:!bg-red-600 dark:hover:!bg-red-700'
                : isEvenRow
                  ? 'hover:!bg-pink-300 dark:hover:!bg-pink-800'
                  : 'hover:!bg-pink-200 dark:hover:!bg-pink-900/50';
            // Sticky hover matches
            const stickyHoverClass = isSelected
              ? ''
              : stale
                ? 'group-hover:!bg-red-600 dark:group-hover:!bg-red-700'
                : isEvenRow
                  ? 'group-hover:!bg-pink-300 dark:group-hover:!bg-pink-800'
                  : 'group-hover:!bg-pink-200 dark:group-hover:!bg-pink-900/50';
            // Neo-brutalist border styling - using outline for full border that doesn't conflict with adjacent rows
            const outlineClass = isSelected
              ? 'outline outline-2 outline-amber-600 dark:outline-amber-500 -outline-offset-1'
              : 'outline-0 hover:outline hover:outline-2 hover:outline-pink-500 dark:hover:outline-pink-400 hover:-outline-offset-1';
            // Zebra striping - stale rows override, then selected, then normal stripe
            const rowBg = isSelected 
              ? '!bg-secondary' 
              : stale 
                ? '!bg-red-700 dark:!bg-red-800 text-white' 
                : isEvenRow 
                  ? 'bg-table-stripe' 
                  : '';
            return (
            <TableRow 
              key={listing.id} 
              className={cn(
                'group cursor-pointer transition-all !border-b-2 !border-foreground',
                rowBg,
                hoverClass,
                outlineClass
              )}
              onClick={() => setSelectedRowId(isSelected ? null : listing.id)}
            >
              {/* Address - Sticky with shadow right border that persists during scroll */}
              <TableCell className={`sticky left-0 z-20 font-medium shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] transition-colors ${stickyBg} ${stickyHoverClass}`}>
                <div className="min-w-[180px] max-w-[220px] whitespace-normal break-words leading-tight py-1">
                  {listing.display_address || listing.address}
                </div>
              </TableCell>
              
              {/* Submarket */}
              <TableCell className="text-sm">{formatSubmarket(listing.submarket)}</TableCell>
              
              {/* City */}
              <TableCell className="text-sm">{listing.city || '-'}</TableCell>
              
              {/* Type */}
              <TableCell className="text-sm">{listing.listing_type || '-'}</TableCell>
              
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
              
              {/* Power (Amps / Voltage combined) */}
              <TableCell className="text-sm">
                {listing.power_amps || listing.voltage
                  ? `${listing.power_amps || '–'}A / ${listing.voltage || '–'}V`
                  : '-'}
              </TableCell>
              
              {/* Sprinkler */}
              <TableCell className="text-sm">{listing.sprinkler || '-'}</TableCell>
              
              {/* Cranes - Y/N based on whether values exist */}
              <TableCell className="text-sm">{(listing.cranes || listing.crane_tons) ? 'Y' : 'N'}</TableCell>
              
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
              
              {/* Notes */}
              <TableCell>
                <div className="truncate max-w-[170px] text-sm text-muted-foreground" title={listing.notes_public || ''}>
                  {listing.notes_public || '-'}
                </div>
              </TableCell>
              
              {/* Status - Near end since most are Active until transaction */}
              <TableCell>
                <StatusDropdown 
                  listing={listing} 
                  onStatusChanged={onRefresh} 
                  onLogTransaction={(l) => setTransactionListing(l)}
                />
              </TableCell>
              
              {/* Last Verified */}
              <TableCell className="text-sm">
                {listing.last_verified_date 
                  ? format(parseISO(listing.last_verified_date), 'MMM d, yyyy')
                  : <span className="text-white/80 font-medium">Never</span>
                }
              </TableCell>
              
              {/* Land Toggle */}
              <TableCell>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleLand(listing);
                  }}
                  disabled={updatingLand === listing.id}
                  className={`px-2 py-1 text-xs font-bold uppercase border-2 border-foreground transition-all disabled:opacity-50 ${
                    listing.has_land 
                      ? 'bg-amber-500 text-amber-950 shadow-[2px_2px_0_hsl(var(--foreground))]' 
                      : 'bg-muted text-muted-foreground shadow-[2px_2px_0_hsl(var(--foreground))]'
                  }`}
                  style={{ borderRadius: 'var(--radius)' }}
                >
                  {listing.has_land ? 'Y' : 'N'}
                </button>
              </TableCell>
              
              {/* Actions - Sticky with shadow left border that persists during scroll */}
              <TableCell className={`sticky right-0 z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.3)] transition-colors ${stickyBg} ${stickyHoverClass}`}>
                <div className="flex items-center gap-0.5">
                  {/* Geo Dropdown */}
                  <DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className={cn(
                              "h-7 w-7 relative",
                              listing.geocode_source === 'manual' && "ring-2 ring-warning ring-offset-1"
                            )}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {listing.latitude && listing.longitude ? (
                              <>
                                <MapPin className={cn(
                                  "h-3.5 w-3.5",
                                  listing.geocode_source === 'manual' ? "text-warning" : "text-green-600"
                                )} />
                                {listing.geocode_source === 'manual' && (
                                  <Hand className="w-2 h-2 absolute -top-0.5 -right-0.5 text-warning" />
                                )}
                              </>
                            ) : (
                              <MapPinOff className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent>Geocode</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditPinListing(listing); }}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit pin location
                      </DropdownMenuItem>
                      {listing.geocode_source !== 'manual' && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAutoGeocode(listing);
                          }}
                          disabled={geocodingId === listing.id}
                        >
                          <MapPin className="w-4 h-4 mr-2" />
                          {geocodingId === listing.id ? 'Auto-geocoding…' : 'Auto-geocode now'}
                        </DropdownMenuItem>
                      )}
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
                  
                  {/* Link */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {listing.link ? (
                        <a 
                          href={listing.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-7 w-7 text-primary hover:text-primary/80 hover:bg-muted rounded-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <span className="inline-flex items-center justify-center h-7 w-7 text-muted-foreground">
                          <ExternalLink className="h-3.5 w-3.5 opacity-30" />
                        </span>
                      )}
                    </TooltipTrigger>
                    <TooltipContent>{listing.link ? 'Open Link' : 'No Link'}</TooltipContent>
                  </Tooltip>
                  
                  {/* Verify */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={stale ? "default" : "ghost"}
                        size="icon"
                        className={cn("h-7 w-7", stale && "bg-green-600 hover:bg-green-700 text-white")}
                        onClick={(e) => { e.stopPropagation(); handleVerify(listing); }}
                        disabled={verifyingId === listing.id}
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Verify Listing</TooltipContent>
                  </Tooltip>
                  
                  {/* Edit */}
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
                  
                  {/* Log Transaction */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); setTransactionListing(listing); }}
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

      {/* Log Transaction Dialog */}
      <LogTransactionDialog
        listing={transactionListing}
        open={transactionListing !== null}
        onOpenChange={(open) => {
          if (!open) setTransactionListing(null);
        }}
        onSaved={() => {
          setTransactionListing(null);
          onRefresh();
        }}
      />
    </div>
  );
}
