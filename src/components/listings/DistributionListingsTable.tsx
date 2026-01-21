import { useState, useMemo } from 'react';
import { Listing, ListingFilter } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
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
import { EditDistributionPinDialog } from './EditDistributionPinDialog';

interface DistributionListingsTableProps {
  listings: Listing[];
  onListingUpdated?: () => void;
}

export function DistributionListingsTable({ listings, onListingUpdated }: DistributionListingsTableProps) {
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ListingFilter>({});
  const [showFilters, setShowFilters] = useState(false);
  const [editPinListing, setEditPinListing] = useState<Listing | null>(null);
  const [geocodingId, setGeocodingId] = useState<string | null>(null);

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
  }, [listings, search, filters]);

  const clearFilters = () => {
    setFilters({});
    setSearch('');
  };

  const hasActiveFilters = search || Object.keys(filters).length > 0;

  const formatSize = (sf: number) => {
    return sf.toLocaleString() + ' SF';
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
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Property</TableHead>
              <TableHead>Submarket</TableHead>
              <TableHead className="text-right">Size</TableHead>
              <TableHead className="text-center">Clear Ht</TableHead>
              <TableHead className="text-center">Docks</TableHead>
              <TableHead>Availability</TableHead>
              <TableHead className="w-20 text-center">Location</TableHead>
              <TableHead className="w-12"></TableHead>
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
              filteredListings.map(listing => (
                <TableRow 
                  key={listing.id}
                  className="hover:bg-muted/30"
                >
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
                        {listing.geocode_source !== 'manual' && (
                          <DropdownMenuItem
                            onClick={() => handleAutoGeocode(listing)}
                            disabled={geocodingId === listing.id}
                          >
                            <MapPin className="w-4 h-4 mr-2" />
                            {geocodingId === listing.id ? 'Auto-geocoding…' : 'Auto-geocode now'}
                          </DropdownMenuItem>
                        )}
                        {listing.geocode_source === 'manual' && (
                          <DropdownMenuItem 
                            onClick={async () => {
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
