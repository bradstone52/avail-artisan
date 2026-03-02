import { useState, useMemo, useEffect, useRef } from 'react';
import { Listing, ListingFilter } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Filter, 
  X, 
  ExternalLink,
  MapPin,
  MapPinOff,
  Hand,
  RotateCcw,
  Pencil,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EditDistributionPinDialog } from './EditDistributionPinDialog';
import { formatSubmarket } from '@/lib/formatters';

interface DistributionListingsTableProps {
  listings: Listing[];
  onListingUpdated?: () => void;
}

export type SortDirection = 'asc' | 'desc' | null;
export type SortableColumn = 'size_sf' | 'clear_height_ft' | 'dock_doors' | 'drive_in_doors';

export function DistributionListingsTable({ listings, onListingUpdated }: DistributionListingsTableProps) {
  const { session } = useAuth();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ListingFilter>({});
  const [showFilters, setShowFilters] = useState(false);
  const [editPinListing, setEditPinListing] = useState<Listing | null>(null);
  const [geocodingId, setGeocodingId] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortableColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Scroll persistence
  const scrollStorageKey = useMemo(() => 'distribution_listings_table_scroll_left_v1', []);

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
      sessionStorage.setItem(scrollStorageKey, String(el.scrollLeft));
    };
  }, [scrollStorageKey]);

  // Keyboard scroll functionality
  useEffect(() => {
    let animationId: number | null = null;
    let scrollDirection = 0;
    let velocity = 0;
    let lastTime = performance.now();
    
    const maxVelocity = 15;
    const acceleration = 0.12;
    const deceleration = 0.92;

    const animate = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - lastTime) / 8.33, 3);
      lastTime = currentTime;

      const container = getScrollEl();
      if (!container) {
        animationId = requestAnimationFrame(animate);
        return;
      }

      if (scrollDirection !== 0) {
        velocity += (scrollDirection * maxVelocity - velocity) * acceleration * deltaTime;
      } else {
        velocity *= Math.pow(deceleration, deltaTime);
      }

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

    animationId = requestAnimationFrame(animate);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isHovered]);

  const handleAutoGeocode = async (listing: Listing) => {
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

      onListingUpdated?.();
    } catch (err) {
      console.error('Failed to auto-geocode:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to auto-geocode');
    } finally {
      setGeocodingId(null);
    }
  };

  const handleSort = (column: SortableColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Sortable header component
  const SortableHeader = ({ column, children, className = '' }: { column: SortableColumn; children: React.ReactNode; className?: string }) => {
    const isActive = sortColumn === column;
    return (
      <TableHead 
        className={cn(
          'h-12 px-4 align-middle text-xs font-bold uppercase tracking-[0.15em] text-background cursor-pointer select-none hover:bg-zinc-600 transition-colors bg-zinc-700 dark:bg-zinc-600',
          className
        )}
        onClick={() => handleSort(column)}
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

  // Get unique values for filters (filter out empty strings)
  const submarkets = useMemo(() => 
    [...new Set(listings.map(l => l.submarket).filter(s => s && s.trim() !== ''))].sort(),
    [listings]
  );

  const filteredListings = useMemo(() => {
    let result = listings.filter(listing => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          listing.property_name?.toLowerCase().includes(searchLower) ||
          listing.address.toLowerCase().includes(searchLower) ||
          listing.city.toLowerCase().includes(searchLower) ||
          listing.submarket.toLowerCase().includes(searchLower) ||
          listing.listing_id.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Submarket filter
      if (filters.submarket?.length && !filters.submarket.includes(listing.submarket)) {
        return false;
      }

      // Size filters
      if (filters.sizeMin && listing.size_sf < filters.sizeMin) return false;
      if (filters.sizeMax && listing.size_sf > filters.sizeMax) return false;

      // Clear height filter
      if (filters.clearHeightMin && (!listing.clear_height_ft || listing.clear_height_ft < filters.clearHeightMin)) {
        return false;
      }

      // Dock doors filter
      if (filters.dockDoorsMin && listing.dock_doors < filters.dockDoorsMin) {
        return false;
      }

      return true;
    });

    // Apply sorting
    if (sortColumn && sortDirection) {
      result = [...result].sort((a, b) => {
        let aVal: number | null = null;
        let bVal: number | null = null;

        switch (sortColumn) {
          case 'size_sf':
            aVal = a.size_sf;
            bVal = b.size_sf;
            break;
          case 'clear_height_ft':
            aVal = a.clear_height_ft;
            bVal = b.clear_height_ft;
            break;
          case 'dock_doors':
            aVal = a.dock_doors;
            bVal = b.dock_doors;
            break;
          case 'drive_in_doors':
            aVal = a.drive_in_doors;
            bVal = b.drive_in_doors;
            break;
        }

        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;

        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    return result;
  }, [listings, search, filters, sortColumn, sortDirection]);

  const clearFilters = () => {
    setFilters({});
    setSearch('');
  };

  const hasActiveFilters = search || Object.keys(filters).length > 0;

  const formatSize = (sf: number) => {
    return sf.toLocaleString();
  };

  const formatAvailability = (value: string | null | undefined): string => {
    if (!value) return 'TBD';
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const date = new Date(value + 'T00:00:00');
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
    }
    
    return value;
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search listings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showFilters ? 'secondary' : 'outline'}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <span className="ml-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
              !
            </span>
          )}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-muted/50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Submarket</label>
            <Select
              value={filters.submarket?.[0] || 'all'}
              onValueChange={(value) => 
                setFilters(f => ({ 
                  ...f, 
                  submarket: value === 'all' ? undefined : [value] 
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All submarkets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All submarkets</SelectItem>
                {submarkets.map(sm => (
                  <SelectItem key={sm} value={sm}>{sm}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Min Size (SF)</label>
            <Input
              type="number"
              placeholder="0"
              value={filters.sizeMin || ''}
              onChange={(e) => 
                setFilters(f => ({ 
                  ...f, 
                  sizeMin: e.target.value ? parseInt(e.target.value) : undefined 
                }))
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Max Size (SF)</label>
            <Input
              type="number"
              placeholder="No limit"
              value={filters.sizeMax || ''}
              onChange={(e) => 
                setFilters(f => ({ 
                  ...f, 
                  sizeMax: e.target.value ? parseInt(e.target.value) : undefined 
                }))
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Min Clear Height</label>
            <Input
              type="number"
              placeholder="0"
              value={filters.clearHeightMin || ''}
              onChange={(e) => 
                setFilters(f => ({ 
                  ...f, 
                  clearHeightMin: e.target.value ? parseInt(e.target.value) : undefined 
                }))
              }
            />
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredListings.length} of {listings.length} distribution listings
      </div>

      {/* Table */}
      <div 
        ref={scrollContainerRef}
        className="relative border border-border rounded-lg shadow-sm overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="region"
        aria-label="Distribution listings table - use left and right arrow keys to scroll"
      >
        {/* Keyboard scroll indicator */}
        {isHovered && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-full shadow-md animate-pulse">
            ⌨️ ← → Scroll
          </div>
        )}
        <Table className="min-w-[1200px]">
          <TableHeader className="sticky top-0 z-10">
            <TableRow>
              <TableHead className="sticky left-0 z-30 min-w-[200px] bg-muted/60 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">Property</TableHead>
              <TableHead className="min-w-[130px] bg-muted/60">Submarket</TableHead>
              <SortableHeader column="size_sf" className="text-right min-w-[100px]">Size (SF)</SortableHeader>
              <SortableHeader column="clear_height_ft" className="text-center min-w-[90px]">Clear Ht</SortableHeader>
              <SortableHeader column="dock_doors" className="text-center min-w-[70px]">Docks</SortableHeader>
              <SortableHeader column="drive_in_doors" className="text-center min-w-[80px]">Drive-In</SortableHeader>
              <TableHead className="min-w-[100px] bg-muted/60">Availability</TableHead>
              <TableHead className="sticky right-0 z-30 min-w-[100px] bg-muted/60 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.08)] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredListings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No listings match your filters
                </TableCell>
              </TableRow>
            ) : (
              filteredListings.map((listing, index) => {
                const isSelected = selectedRowId === listing.id;
                const isEvenRow = index % 2 === 1;
                
                // Sticky columns match the rest of the table's striping
                const stickyBg = isSelected 
                  ? 'bg-blue-50' 
                  : isEvenRow 
                    ? 'bg-table-stripe' 
                    : 'bg-card';
                
                // Modern hover
                const hoverClass = isSelected 
                  ? 'hover:!bg-blue-100 dark:hover:!bg-blue-950/40' 
                  : isEvenRow
                    ? 'hover:!bg-slate-100 dark:hover:!bg-slate-800/60'
                    : 'hover:!bg-slate-50 dark:hover:!bg-slate-800/40';
                
                // Sticky hover matches
                const stickyHoverClass = isSelected
                  ? ''
                  : isEvenRow
                    ? 'group-hover:!bg-slate-100 dark:group-hover:!bg-slate-800/60'
                    : 'group-hover:!bg-slate-50 dark:group-hover:!bg-slate-800/40';
                
                // Modern border styling
                const outlineClass = isSelected
                  ? 'outline outline-2 outline-blue-400 dark:outline-blue-500 -outline-offset-1'
                  : 'outline-0 hover:outline hover:outline-1 hover:outline-slate-300 dark:hover:outline-slate-600 hover:-outline-offset-1';
                
                // Zebra striping
                const rowBg = isSelected 
                  ? '!bg-blue-50 dark:!bg-blue-950/30' 
                  : isEvenRow 
                    ? 'bg-table-stripe' 
                    : '';

                return (
                  <TableRow 
                    key={listing.id}
                    className={cn(
                      'group cursor-pointer transition-all !border-b !border-border',
                      rowBg,
                      hoverClass,
                      outlineClass
                    )}
                    onClick={() => setSelectedRowId(isSelected ? null : listing.id)}
                  >
                    {/* Property - Sticky */}
                    <TableCell className={cn(
                      'sticky left-0 z-20 font-medium shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] transition-colors',
                      stickyBg,
                      stickyHoverClass
                    )}>
                      <div className="min-w-[180px] max-w-[220px] whitespace-normal break-words leading-tight py-1">
                        <p className="font-medium text-sm">
                          {listing.property_name || listing.address}
                        </p>
                        {listing.property_name && (
                          <p className="text-xs text-muted-foreground">{listing.address}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{listing.city}</p>
                      </div>
                    </TableCell>
                    
                    {/* Submarket */}
                    <TableCell className="text-sm">{formatSubmarket(listing.submarket)}</TableCell>
                    
                    {/* Size */}
                    <TableCell className="text-right font-mono text-sm">
                      {formatSize(listing.size_sf)}
                    </TableCell>
                    
                    {/* Clear Height */}
                    <TableCell className="text-center text-sm">
                      {listing.clear_height_ft ? `${listing.clear_height_ft}'` : '—'}
                    </TableCell>
                    
                    {/* Dock Doors */}
                    <TableCell className="text-center text-sm">
                      {listing.dock_doors || '—'}
                    </TableCell>
                    
                    {/* Drive-In Doors */}
                    <TableCell className="text-center text-sm">
                      {listing.drive_in_doors || '—'}
                    </TableCell>
                    
                    {/* Availability */}
                    <TableCell className="text-sm">
                      {formatAvailability(listing.availability_date)}
                    </TableCell>
                    
                    {/* Actions - Sticky (Location + Link) */}
                    <TableCell className={cn(
                      'sticky right-0 z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.3)] transition-colors',
                      stickyBg,
                      stickyHoverClass
                    )}>
                      <div className="flex items-center justify-center gap-1">
                        {/* Location */}
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
                                    listing.geocode_source === 'manual' ? "text-warning" : "text-primary"
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
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setEditPinListing(listing);
                            }}>
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
                                onClick={async (e) => {
                                  e.stopPropagation();
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
                                    onListingUpdated?.();
                                  } catch (err) {
                                    console.error('Failed to reset pin:', err);
                                    toast.error('Failed to reset pin location');
                                  }
                                }}
                              >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Reset to auto-geocode
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        {/* External Link */}
                        {listing.link && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <a href={listing.link} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Pin Location Dialog */}
      <EditDistributionPinDialog
        listing={editPinListing}
        open={editPinListing !== null}
        onOpenChange={(open) => {
          if (!open) setEditPinListing(null);
        }}
        onSave={() => {
          setEditPinListing(null);
          onListingUpdated?.();
        }}
      />
    </div>
  );
}
