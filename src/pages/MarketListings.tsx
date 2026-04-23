import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useMarketListings, MarketListing } from '@/hooks/useMarketListings';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RefreshCw, Database, Search, X, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus, ChevronDown, Wrench, AlertTriangle, Pencil } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { MarketListingEditDialog } from '@/components/market/MarketListingEditDialog';
import { MarketListingsTable, SortableColumn, SortDirection } from '@/components/market/MarketListingsTable';
import { LogTransactionDialog } from '@/components/market/LogTransactionDialog';
import { normalizeAddressForDupeCheck } from '@/components/market/DuplicateListingsDialog';
import { BulkEditListingsDialog } from '@/components/market/BulkEditListingsDialog';

const SIZE_RANGES = [
  { label: 'All Sizes', value: 'all', min: 0, max: Infinity },
  { label: 'Under 50,000 SF', value: 'under50k', min: 0, max: 50000 },
  { label: '50,000 - 100,000 SF', value: '50k-100k', min: 50000, max: 100000 },
  { label: '100,000 - 200,000 SF', value: '100k-200k', min: 100000, max: 200000 },
  { label: '200,000 - 500,000 SF', value: '200k-500k', min: 200000, max: 500000 },
  { label: 'Over 500,000 SF', value: 'over500k', min: 500000, max: Infinity },
];

const ALL_MARKET_STATUS_OPTIONS = ['Active', 'Under Contract', 'Sold/Leased', 'Unknown/Removed'] as const;

export default function MarketListings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    listings,
    fetchListings,
    loading,
    refreshListings,
  } = useMarketListings();

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [submarketFilter, setSubmarketFilter] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [distWarehouseFilter, setDistWarehouseFilter] = useState<string>('all');
  const [brokerFilter, setBrokerFilter] = useState<string>('all');
  const [listingTypeFilter, setListingTypeFilter] = useState<string>('all');
  const [landlordFilter, setLandlordFilter] = useState<string>('all');
  const [docksFilter, setDocksFilter] = useState<string>('all');
  const [driveInFilter, setDriveInFilter] = useState<string>('all');
  const [staleFilter, setStaleFilter] = useState<string>('all');
  const [landOnlyFilter, setLandOnlyFilter] = useState<string>('all');
  const [calgaryQuadFilter, setCalgaryQuadFilter] = useState<string>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Sort state
  const [sortColumn, setSortColumn] = useState<SortableColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Edit/Create dialog state
  const [editingListing, setEditingListing] = useState<MarketListing | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [duplicatingListing, setDuplicatingListing] = useState<MarketListing | null>(null);
  const [transactionListing, setTransactionListing] = useState<MarketListing | null>(null);
  const [flaggedListingIds, setFlaggedListingIds] = useState<string[]>([]);

  // Read flagged/search params from URL on mount (set by admin audit tools)
  useEffect(() => {
    const flagged = searchParams.get('flagged');
    if (flagged) setFlaggedListingIds(flagged.split(',').filter(Boolean));
    const search = searchParams.get('search');
    if (search) setSearchQuery(search);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      const allSelected = ids.every(id => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      } else {
        const next = new Set(prev);
        ids.forEach(id => next.add(id));
        return next;
      }
    });
  }, []);

  // Handle column sorting
  const handleSort = useCallback((column: SortableColumn) => {
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
    setCurrentPage(1); // Reset to first page when sorting
  }, [sortColumn, sortDirection]);

  // Get unique values for filters
  const uniqueSubmarkets = useMemo(() => {
    const submarkets = [...new Set(listings.map(l => l.submarket).filter(Boolean))];
    return submarkets.sort();
  }, [listings]);

  const uniqueCities = useMemo(() => {
    const cities = [...new Set(listings.map(l => l.city).filter(Boolean))] as string[];
    return cities.sort();
  }, [listings]);

  const uniqueStatuses = useMemo(() => {
    const statuses = [...new Set(listings.map(l => l.status).filter(Boolean))];
    return statuses.sort();
  }, [listings]);

  const statusOptions = useMemo(() => {
    const extras = uniqueStatuses.filter((s) => !(ALL_MARKET_STATUS_OPTIONS as readonly string[]).includes(s));
    return [...ALL_MARKET_STATUS_OPTIONS, ...extras];
  }, [uniqueStatuses]);

  const uniqueBrokers = useMemo(() => {
    const brokers = [...new Set(listings.map(l => l.broker_source).filter(Boolean))] as string[];
    return brokers.sort();
  }, [listings]);

  const uniqueListingTypes = useMemo(() => {
    const normalize = (t: string) => (t === 'Sale/Lease' ? 'Sale or Lease' : t);
    const types = [...new Set(listings.map(l => l.listing_type).filter(Boolean).map(t => normalize(t as string)))] as string[];
    return types.sort();
  }, [listings]);

  const uniqueLandlords = useMemo(() => {
    const landlords = [...new Set(listings.map(l => l.landlord).filter(Boolean))] as string[];
    return landlords.sort();
  }, [listings]);

  // Filter listings
  const filteredListings = useMemo(() => {
    return listings.filter(listing => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          listing.address?.toLowerCase().includes(query) ||
          listing.display_address?.toLowerCase().includes(query) ||
          listing.listing_id?.toLowerCase().includes(query) ||
          listing.submarket?.toLowerCase().includes(query) ||
          listing.landlord?.toLowerCase().includes(query) ||
          listing.broker_source?.toLowerCase().includes(query) ||
          (listing as any).development_name?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Submarket filter (multi-select)
      if (submarketFilter.length > 0 && !submarketFilter.includes(listing.submarket)) {
        return false;
      }

      // City filter
      if (cityFilter !== 'all' && listing.city !== cityFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && listing.status !== statusFilter) {
        return false;
      }

      // Size filter
      if (sizeFilter !== 'all') {
        const range = SIZE_RANGES.find(r => r.value === sizeFilter);
        if (range && (listing.size_sf < range.min || listing.size_sf >= range.max)) {
          return false;
        }
      }

      // Distribution warehouse filter
      if (distWarehouseFilter !== 'all') {
        const isDistWarehouse = listing.is_distribution_warehouse === true;
        if (distWarehouseFilter === 'yes' && !isDistWarehouse) return false;
        if (distWarehouseFilter === 'no' && isDistWarehouse) return false;
      }

      // Broker filter
      if (brokerFilter !== 'all' && listing.broker_source !== brokerFilter) {
        return false;
      }

      // Listing type filter (normalize Sale/Lease variants)
      if (listingTypeFilter !== 'all') {
        const normalized = listing.listing_type === 'Sale/Lease' ? 'Sale or Lease' : listing.listing_type;
        if (normalized !== listingTypeFilter) return false;
      }

      // Landlord filter
      if (landlordFilter !== 'all' && listing.landlord !== landlordFilter) {
        return false;
      }

      // Docks filter
      if (docksFilter !== 'all') {
        const hasDocks = listing.dock_doors != null && listing.dock_doors > 0;
        if (docksFilter === 'yes' && !hasDocks) return false;
        if (docksFilter === 'no' && hasDocks) return false;
      }

      // Drive-In filter
      if (driveInFilter !== 'all') {
        const hasDriveIn = listing.drive_in_doors != null && listing.drive_in_doors > 0;
        if (driveInFilter === 'yes' && !hasDriveIn) return false;
        if (driveInFilter === 'no' && hasDriveIn) return false;
      }

      // Stale (30+ days unverified) filter
      if (staleFilter !== 'all') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const isStale = !listing.last_verified_date || new Date(listing.last_verified_date) < thirtyDaysAgo;
        if (staleFilter === 'yes' && !isStale) return false;
        if (staleFilter === 'no' && isStale) return false;
      }

      // Land Only filter
      if (landOnlyFilter !== 'all') {
        const hasLand = (listing as any).has_land === true;
        if (landOnlyFilter === 'yes' && !hasLand) return false;
        if (landOnlyFilter === 'no' && hasLand) return false;
      }

      // Calgary Quad filter
      if (calgaryQuadFilter !== 'all') {
        if (listing.calgary_quad !== calgaryQuadFilter) return false;
      }

      // Flagged (not in PDF) filter
      if (flaggedListingIds.length > 0 && !flaggedListingIds.includes(listing.id)) {
        return false;
      }

      return true;
    });
  }, [listings, searchQuery, submarketFilter, cityFilter, statusFilter, sizeFilter, distWarehouseFilter, brokerFilter, listingTypeFilter, landlordFilter, docksFilter, driveInFilter, staleFilter, landOnlyFilter, calgaryQuadFilter, flaggedListingIds]);

  const hasActiveFilters = searchQuery || submarketFilter.length > 0 || cityFilter !== 'all' || statusFilter !== 'all' || sizeFilter !== 'all' || distWarehouseFilter !== 'all' || brokerFilter !== 'all' || listingTypeFilter !== 'all' || landlordFilter !== 'all' || docksFilter !== 'all' || driveInFilter !== 'all' || staleFilter !== 'all' || landOnlyFilter !== 'all' || calgaryQuadFilter !== 'all';

  // Sort filtered listings
  const sortedListings = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredListings;
    
    return [...filteredListings].sort((a, b) => {
      let aVal: number | string | null = null;
      let bVal: number | string | null = null;
      
      switch (sortColumn) {
        case 'size_sf':
          aVal = a.size_sf;
          bVal = b.size_sf;
          break;
        case 'warehouse_sf':
          aVal = a.warehouse_sf;
          bVal = b.warehouse_sf;
          break;
        case 'office_sf':
          aVal = a.office_sf;
          bVal = b.office_sf;
          break;
        case 'dock_doors':
          aVal = a.dock_doors;
          bVal = b.dock_doors;
          break;
        case 'drive_in_doors':
          aVal = a.drive_in_doors;
          bVal = b.drive_in_doors;
          break;
        case 'power_amps':
          aVal = a.power_amps;
          bVal = b.power_amps;
          break;
        case 'last_verified_date':
          aVal = a.last_verified_date;
          bVal = b.last_verified_date;
          break;
      }
      
      // Handle nulls - push to end
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      
      // For power_amps (string), parse numeric value
      if (sortColumn === 'power_amps') {
        const aNum = parseFloat(String(aVal).replace(/[^0-9.-]/g, '')) || 0;
        const bNum = parseFloat(String(bVal).replace(/[^0-9.-]/g, '')) || 0;
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // For last_verified_date (string date), compare as strings (ISO format sorts correctly)
      if (sortColumn === 'last_verified_date') {
        const aStr = String(aVal);
        const bStr = String(bVal);
        const cmp = aStr.localeCompare(bStr);
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      
      // Numeric comparison
      const aNum = typeof aVal === 'number' ? aVal : 0;
      const bNum = typeof bVal === 'number' ? bVal : 0;
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    });
  }, [filteredListings, sortColumn, sortDirection]);

  // Pagination calculations - now uses sorted listings
  const totalPages = Math.ceil(sortedListings.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedListings = sortedListings.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const clearFilters = () => {
    setSearchQuery('');
    setSubmarketFilter([]);
    setCityFilter('all');
    setStatusFilter('all');
    setSizeFilter('all');
    setDistWarehouseFilter('all');
    setBrokerFilter('all');
    setListingTypeFilter('all');
    setLandlordFilter('all');
    setDocksFilter('all');
    setDriveInFilter('all');
    setStaleFilter('all');
    setLandOnlyFilter('all');
    setCalgaryQuadFilter('all');
    setFlaggedListingIds([]);
    setCurrentPage(1);
  };

  const toggleSubmarket = (submarket: string) => {
    setSubmarketFilter(prev => 
      prev.includes(submarket) 
        ? prev.filter(s => s !== submarket)
        : [...prev, submarket]
    );
  };

  // Reset page when filtered results change
  useMemo(() => {
    if (currentPage > 1 && currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [sortedListings.length, currentPage, totalPages]);

  const distributionCount = listings.filter(l => l.is_distribution_warehouse).length;
   const hasAnyLink = (l: MarketListing) => (l.link && l.link !== '') || (l.brochure_link && l.brochure_link !== '');
   const linksWithUrl = listings.filter(l => hasAnyLink(l));
   const linksMissing = listings.filter(l => !hasAnyLink(l) && l.status === 'Active').length;
   const linksOk = linksWithUrl.filter(l => l.link_status === 'ok').length;
   const linksBroken = linksWithUrl.filter(l => l.link_status === 'broken').length;
   const linksError = linksWithUrl.filter(l => l.link_status === 'error').length;
   const linksRestricted = linksWithUrl.filter(l => l.link_status === 'restricted').length;
   const linksUnchecked = linksWithUrl.filter(l => !l.link_status).length;
  const hasLinkIssues = linksBroken > 0 || linksError > 0 || linksMissing > 0 || linksRestricted > 0;

  const geocodedCount = listings.filter(l => l.latitude && l.longitude).length;
  const ungeocodeCount = listings.length - geocodedCount;

  const duplicateCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of listings) {
      const addr = normalizeAddressForDupeCheck(l);
      if (!addr) continue;
      const key = `${addr}||${l.size_sf ?? ''}||${l.land_acres ?? ''}||${l.listing_type ?? ''}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    let extras = 0;
    for (const c of counts.values()) if (c > 1) extras += c - 1;
    return extras;
  }, [listings]);

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold">Market Listings</h1>
            <p className="text-muted-foreground mt-1">
              {listings.length} total listings • {distributionCount} distribution warehouses
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => navigate('/market-listings/admin')}
            >
              <Wrench className="w-4 h-4 mr-2" />
              Tools
            </Button>
            <Button size="sm" className="flex-1 sm:flex-none" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Listing
            </Button>
          </div>
        </div>

        {/* Stats Cards - Compact */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <Card className="py-2">
            <CardHeader className="py-1.5 px-4">
              <CardDescription className="text-xs">Total Listings</CardDescription>
              <CardTitle className="text-2xl">{listings.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="py-2">
            <CardHeader className="py-1.5 px-4">
              <CardDescription className="text-xs">Distribution Warehouses</CardDescription>
              <CardTitle className="text-2xl">{distributionCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="py-2">
            <CardHeader className="py-1.5 px-4">
              <CardDescription className="text-xs">Geocoded</CardDescription>
              <CardTitle className="text-2xl">
                <span className="text-green-600">{geocodedCount}</span>
                {ungeocodeCount > 0 && (
                  <span className="text-destructive text-base"> / {ungeocodeCount} <span className="text-xs font-bold">MISSING</span></span>
                )}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="py-2">
            <CardHeader className="py-1.5 px-4">
              <CardDescription className="text-xs">Duplicates</CardDescription>
              <CardTitle className="text-2xl">
                {duplicateCount === 0 ? (
                  <span className="text-green-600">0</span>
                ) : (
                  <span className="text-destructive">{duplicateCount}</span>
                )}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="py-2">
            <CardHeader className="py-1.5 px-4">
              <CardDescription className="text-xs">Link Health</CardDescription>
              <CardTitle className="text-base leading-tight">
                <span className="text-green-600">{linksOk}</span>
                {linksBroken > 0 && <span className="text-destructive"> / {linksBroken} <span className="text-xs font-bold">BROKEN</span></span>}
                {linksRestricted > 0 && <span className="text-amber-500"> / {linksRestricted} <span className="text-xs font-bold">RESTRICTED</span></span>}
                {linksError > 0 && <span className="text-orange-500"> / {linksError} <span className="text-xs font-bold">ERRORS</span></span>}
                {linksMissing > 0 && <span className="text-muted-foreground"> / {linksMissing} <span className="text-xs font-bold">MISSING</span></span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-1.5 px-4">
              {linksUnchecked > 0 ? (
                <span className="text-xs text-muted-foreground">{linksUnchecked} unchecked</span>
              ) : linksWithUrl.length > 0 ? (
                <Badge variant="outline" className="text-[10px] h-5">All checked</Badge>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Flagged Listings Banner */}
        {flaggedListingIds.length > 0 && (
          <div className="mb-4 flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            <p className="text-sm font-medium flex-1">
              Showing <span className="text-destructive font-bold">{flaggedListingIds.length}</span> listings not found in the uploaded PDF
            </p>
            <Button variant="outline" size="sm" onClick={() => { setFlaggedListingIds([]); navigate('/market-listings', { replace: true }); }}>
              <X className="w-3 h-3 mr-1" />
              Clear Flag
            </Button>
          </div>
        )}

        {/* Filters */}
        {listings.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <CardTitle className="text-lg">Filters</CardTitle>
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="w-4 h-4 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Search */}
                <div className="lg:col-span-2">
                  <Label htmlFor="search" className="text-xs text-muted-foreground mb-1.5 block">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Address, ID, landlord, development..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-8"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Clear search"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* City */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">City</Label>
                  <Select value={cityFilter} onValueChange={setCityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Cities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {uniqueCities.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Submarket - Multi-select */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Submarket</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full justify-between font-normal"
                      >
                        <span className="truncate">
                          {submarketFilter.length === 0 
                            ? 'All Submarkets' 
                            : submarketFilter.length === 1 
                              ? submarketFilter[0]
                              : `${submarketFilter.length} selected`}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[200px] p-2 bg-background z-50" align="start">
                      <div className="space-y-1 max-h-[250px] overflow-y-auto">
                        {submarketFilter.length > 0 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full justify-start text-muted-foreground mb-1"
                            onClick={() => setSubmarketFilter([])}
                          >
                            Clear selection
                          </Button>
                        )}
                        {uniqueSubmarkets.map(submarket => (
                          <div 
                            key={submarket} 
                            className="flex items-center space-x-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                            onClick={() => toggleSubmarket(submarket)}
                          >
                            <Checkbox 
                              checked={submarketFilter.includes(submarket)}
                              onCheckedChange={() => toggleSubmarket(submarket)}
                            />
                            <span className="text-sm">{submarket}</span>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Status */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {statusOptions.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Size Range */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Size Range</Label>
                  <Select value={sizeFilter} onValueChange={setSizeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Sizes" />
                    </SelectTrigger>
                    <SelectContent>
                      {SIZE_RANGES.map(range => (
                        <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Distribution Warehouse */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Dist. Warehouse</Label>
                  <Select value={distWarehouseFilter} onValueChange={setDistWarehouseFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Broker Source */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Broker Source</Label>
                  <Select value={brokerFilter} onValueChange={setBrokerFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Brokers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Brokers</SelectItem>
                      {uniqueBrokers.map(broker => (
                        <SelectItem key={broker} value={broker}>{broker}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Listing Type */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Listing Type</Label>
                  <Select value={listingTypeFilter} onValueChange={setListingTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {uniqueListingTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Landlord */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Landlord</Label>
                  <Select value={landlordFilter} onValueChange={setLandlordFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Landlords" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Landlords</SelectItem>
                      {uniqueLandlords.map(landlord => (
                        <SelectItem key={landlord} value={landlord}>{landlord}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Docks */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Docks</Label>
                  <Select value={docksFilter} onValueChange={setDocksFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="yes">Has Docks</SelectItem>
                      <SelectItem value="no">No Docks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Stale (30+ days) */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Verified</Label>
                  <Select value={staleFilter} onValueChange={setStaleFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="yes">Stale (30+ days)</SelectItem>
                      <SelectItem value="no">Recently Verified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Land Only */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Land Only</Label>
                  <Select value={landOnlyFilter} onValueChange={setLandOnlyFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="yes">Land Only</SelectItem>
                      <SelectItem value="no">Not Land</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Drive-In */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Drive-In</Label>
                  <Select value={driveInFilter} onValueChange={setDriveInFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="yes">Has Drive-In</SelectItem>
                      <SelectItem value="no">No Drive-In</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Calgary Quad */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Calgary Quad.</Label>
                  <Select value={calgaryQuadFilter} onValueChange={setCalgaryQuadFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="NE">NE</SelectItem>
                      <SelectItem value="NW">NW</SelectItem>
                      <SelectItem value="SE">SE</SelectItem>
                      <SelectItem value="SW">SW</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Filter results summary */}
              {hasActiveFilters && (
                <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                  Showing {filteredListings.length} of {listings.length} listings
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Listings Table */}
        {listings.length === 0 ? (
          <div className="text-center py-16 bg-muted/30 rounded-xl border border-dashed border-border">
            <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-display font-semibold mb-2">No Market Listings</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Click "Add Listing" to create your first market listing.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Listing
            </Button>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-16 bg-muted/30 rounded-xl border border-dashed border-border">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-display font-semibold mb-2">No Matching Listings</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              No listings match your current filter criteria.
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              {/* Selection toolbar */}
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-primary/5">
                  <span className="text-sm font-medium text-primary">
                    {selectedIds.size} listing{selectedIds.size !== 1 ? 's' : ''} selected
                  </span>
                  <Button size="sm" onClick={() => setIsBulkEditOpen(true)}>
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Bulk Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>
                    <X className="w-3.5 h-3.5 mr-1" />
                    Clear
                  </Button>
                </div>
              )}
              <MarketListingsTable 
                listings={paginatedListings} 
                onEdit={setEditingListing}
                onDuplicate={(listing) => { setDuplicatingListing(listing); setIsCreateDialogOpen(true); }}
                onRefresh={refreshListings}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onToggleSelectAll={handleToggleSelectAll}
              />
              
              {/* Pagination Controls */}
              <div className="flex items-center justify-between p-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, sortedListings.length)} of {sortedListings.length} listings
                  <span className="ml-2 text-xs">(Use ← → arrow keys to scroll table)</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1 px-2">
                    <span className="text-sm font-medium">{currentPage}</span>
                    <span className="text-sm text-muted-foreground">of</span>
                    <span className="text-sm font-medium">{totalPages}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bulk Edit Dialog */}
        <BulkEditListingsDialog
          open={isBulkEditOpen}
          onOpenChange={setIsBulkEditOpen}
          selectedIds={selectedIds}
          listings={listings}
          uniqueSubmarkets={uniqueSubmarkets}
          uniqueCities={uniqueCities}
          onSaved={() => {
            setSelectedIds(new Set());
            fetchListings();
          }}
        />

        {/* Edit Dialog */}
        <MarketListingEditDialog
          listing={editingListing}
          open={!!editingListing && editingListing !== null}
          onOpenChange={(open) => {
            if (!open) setEditingListing(null);
          }}
          onSaved={refreshListings}
          mode="edit"
          onLogTransaction={(listing) => setTransactionListing(listing)}
        />

        {/* Create Dialog */}
        <MarketListingEditDialog
          listing={null}
          open={isCreateDialogOpen}
          onOpenChange={(open) => { setIsCreateDialogOpen(open); if (!open) setDuplicatingListing(null); }}
          onSaved={refreshListings}
          mode="create"
          duplicateFrom={duplicatingListing}
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
            refreshListings();
          }}
        />

      </div>
    </AppLayout>
  );
}
