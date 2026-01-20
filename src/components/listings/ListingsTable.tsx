import { useState, useMemo } from 'react';
import { Listing, ListingFilter } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EditPinLocationDialog } from './EditPinLocationDialog';

interface ListingsTableProps {
  listings: Listing[];
  onToggleInclude?: (listing: Listing) => void;
  onListingUpdated?: () => void;
}

export function ListingsTable({ listings, onToggleInclude, onListingUpdated }: ListingsTableProps) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ListingFilter>({});
  const [showFilters, setShowFilters] = useState(false);
  const [editPinListing, setEditPinListing] = useState<Listing | null>(null);

  // Get unique values for filters
  const submarkets = useMemo(() => 
    [...new Set(listings.map(l => l.submarket))].sort(),
    [listings]
  );

  const filteredListings = useMemo(() => {
    return listings.filter(listing => {
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

      // Status filter
      if (filters.status?.length && !filters.status.includes(listing.status)) {
        return false;
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

      // Include in issue filter
      if (filters.includeInIssue !== undefined && listing.include_in_issue !== filters.includeInIssue) {
        return false;
      }

      return true;
    });
  }, [listings, search, filters]);

  const clearFilters = () => {
    setFilters({});
    setSearch('');
  };

  const hasActiveFilters = search || Object.keys(filters).length > 0;

  const formatSize = (sf: number) => {
    return sf.toLocaleString() + ' SF';
  };

  /**
   * Format availability date for display.
   * ISO dates like "2026-02-15" become "Feb 2026".
   * Text values like "TBD", "30 Days", "2027" are shown as-is.
   */
  const formatAvailability = (value: string | null | undefined): string => {
    if (!value) return 'TBD';
    
    // Check if it's an ISO date (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const date = new Date(value + 'T00:00:00');
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
    }
    
    // Return as-is for text values like "TBD", "30 Days", "2027", etc.
    return value;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge className="bg-success text-success-foreground">Active</Badge>;
      case 'Leased':
        return <Badge variant="secondary">Leased</Badge>;
      case 'OnHold':
        return <Badge className="bg-warning text-warning-foreground">On Hold</Badge>;
      case 'Removed':
        return <Badge variant="destructive">Removed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
            <label className="text-sm font-medium mb-1.5 block">Status</label>
            <Select
              value={filters.status?.[0] || 'all'}
              onValueChange={(value) => 
                setFilters(f => ({ 
                  ...f, 
                  status: value === 'all' ? undefined : [value] 
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Leased">Leased</SelectItem>
                <SelectItem value="OnHold">On Hold</SelectItem>
                <SelectItem value="Removed">Removed</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
        </div>
      )}

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredListings.length} of {listings.length} listings
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <span className="sr-only">Include</span>
              </TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Submarket</TableHead>
              <TableHead className="text-right">Size</TableHead>
              <TableHead className="text-center">Clear Ht</TableHead>
              <TableHead className="text-center">Docks</TableHead>
              <TableHead>Availability</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20 text-center">Location</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredListings.length === 0 ? (
              <TableRow>
              <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                  No listings match your filters
                </TableCell>
              </TableRow>
            ) : (
              filteredListings.map(listing => (
                <TableRow 
                  key={listing.id}
                  className={cn(
                    "hover:bg-muted/30",
                    !listing.include_in_issue && "opacity-60"
                  )}
                >
                  <TableCell>
                    <Checkbox
                      checked={listing.include_in_issue}
                      onCheckedChange={() => onToggleInclude?.(listing)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">
                        {listing.property_name || listing.address}
                      </p>
                      {listing.property_name && (
                        <p className="text-xs text-muted-foreground">{listing.address}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{listing.city}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{listing.submarket}</TableCell>
                  <TableCell className="text-right font-medium text-sm">
                    {formatSize(listing.size_sf)}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {listing.clear_height_ft ? `${listing.clear_height_ft}'` : '—'}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {listing.dock_doors || '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatAvailability(listing.availability_date)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(listing.status)}
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={cn(
                            "h-8 w-8 relative",
                            listing.geocode_source === 'manual' && "ring-2 ring-warning ring-offset-1"
                          )}
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
                        <DropdownMenuItem onClick={() => setEditPinListing(listing)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit pin location
                        </DropdownMenuItem>
                        {listing.geocode_source === 'manual' && (
                          <DropdownMenuItem 
                            onClick={async () => {
                              try {
                                const { error } = await supabase
                                  .from('listings')
                                  .update({
                                    latitude: null,
                                    longitude: null,
                                    geocode_source: null,
                                    geocoded_at: null,
                                  })
                                  .eq('id', listing.id);
                                
                                if (error) throw error;
                                toast.success('Pin reset - will be auto-geocoded on next sync');
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
                  </TableCell>
                  <TableCell>
                    {listing.link && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a href={listing.link} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Pin Location Dialog */}
      <EditPinLocationDialog
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
