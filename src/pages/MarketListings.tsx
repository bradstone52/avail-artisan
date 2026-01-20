import { useState, useMemo } from 'react';
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
import { RefreshCw, Database, Search, X, Filter, Link2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { MarketListingEditDialog } from '@/components/market/MarketListingEditDialog';
import { MarketListingsTable } from '@/components/market/MarketListingsTable';

const SIZE_RANGES = [
  { label: 'All Sizes', value: 'all', min: 0, max: Infinity },
  { label: 'Under 50,000 SF', value: 'under50k', min: 0, max: 50000 },
  { label: '50,000 - 100,000 SF', value: '50k-100k', min: 50000, max: 100000 },
  { label: '100,000 - 200,000 SF', value: '100k-200k', min: 100000, max: 200000 },
  { label: '200,000 - 500,000 SF', value: '200k-500k', min: 200000, max: 500000 },
  { label: 'Over 500,000 SF', value: 'over500k', min: 500000, max: Infinity },
];

export default function MarketListings() {
  const { 
    listings, 
    syncLogs,
    loading, 
    isSyncing,
    isValidatingLinks,
    syncMarketListings,
    validateLinks,
    refreshListings,
  } = useMarketListings();

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [submarketFilter, setSubmarketFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [distWarehouseFilter, setDistWarehouseFilter] = useState<string>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Edit/Create dialog state
  const [editingListing, setEditingListing] = useState<MarketListing | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Get unique values for filters
  const uniqueSubmarkets = useMemo(() => {
    const submarkets = [...new Set(listings.map(l => l.submarket).filter(Boolean))];
    return submarkets.sort();
  }, [listings]);

  const uniqueStatuses = useMemo(() => {
    const statuses = [...new Set(listings.map(l => l.status).filter(Boolean))];
    return statuses.sort();
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
          listing.broker_source?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Submarket filter
      if (submarketFilter !== 'all' && listing.submarket !== submarketFilter) {
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

      return true;
    });
  }, [listings, searchQuery, submarketFilter, statusFilter, sizeFilter, distWarehouseFilter]);

  const hasActiveFilters = searchQuery || submarketFilter !== 'all' || statusFilter !== 'all' || sizeFilter !== 'all' || distWarehouseFilter !== 'all';

  // Pagination calculations
  const totalPages = Math.ceil(filteredListings.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedListings = filteredListings.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const clearFilters = () => {
    setSearchQuery('');
    setSubmarketFilter('all');
    setStatusFilter('all');
    setSizeFilter('all');
    setDistWarehouseFilter('all');
    setCurrentPage(1);
  };

  // Reset page when filtered results change
  useMemo(() => {
    if (currentPage > 1 && currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [filteredListings.length, currentPage, totalPages]);

  const lastSync = syncLogs[0];
  const distributionCount = listings.filter(l => l.is_distribution_warehouse).length;
  const linksWithUrl = listings.filter(l => l.link && l.link !== '');
  const linksOk = linksWithUrl.filter(l => l.link_status === 'ok').length;
  const linksBroken = linksWithUrl.filter(l => l.link_status === 'broken').length;
  const linksUnchecked = linksWithUrl.filter(l => !l.link_status).length;

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold">Market Listings</h1>
            <p className="text-muted-foreground mt-1">
              {listings.length} total listings • {distributionCount} distribution warehouses
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              onClick={validateLinks}
              disabled={isValidatingLinks || linksWithUrl.length === 0}
            >
              <Link2 className={`w-4 h-4 mr-2 ${isValidatingLinks ? 'animate-pulse' : ''}`} />
              {isValidatingLinks ? 'Checking...' : 'Check Links'}
            </Button>
            <Button 
              variant="outline"
              onClick={syncMarketListings}
              disabled={isSyncing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync'}
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Listing
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Listings</CardDescription>
              <CardTitle className="text-3xl">{listings.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Distribution Warehouses</CardDescription>
              <CardTitle className="text-3xl">{distributionCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Geocoded</CardDescription>
              <CardTitle className="text-3xl">
                {listings.filter(l => l.latitude && l.longitude).length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Link Health</CardDescription>
              <CardTitle className="text-lg">
                <span className="text-green-600">{linksOk}</span>
                {linksBroken > 0 && <span className="text-destructive"> / {linksBroken} broken</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {linksUnchecked > 0 ? (
                <span className="text-xs text-muted-foreground">{linksUnchecked} unchecked</span>
              ) : linksWithUrl.length > 0 ? (
                <Badge variant="outline" className="text-xs">All checked</Badge>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Last Sync</CardDescription>
              <CardTitle className="text-lg">
                {lastSync 
                  ? format(new Date(lastSync.started_at), 'MMM d, h:mm a')
                  : 'Never'}
              </CardTitle>
            </CardHeader>
            {lastSync && (
              <CardContent className="pt-0">
                <Badge variant={lastSync.status === 'completed' ? 'default' : 'destructive'}>
                  {lastSync.status}
                </Badge>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Sync Logs */}
        {syncLogs.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Recent Syncs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {syncLogs.slice(0, 5).map(log => (
                  <div key={log.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                    <div className="flex items-center gap-3">
                      <Badge variant={log.status === 'completed' ? 'default' : 'destructive'}>
                        {log.status}
                      </Badge>
                      <span className="text-muted-foreground">
                        {format(new Date(log.started_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span>{log.rows_read || 0} read</span>
                      <span>{log.rows_imported || 0} imported</span>
                      <span>{log.rows_skipped || 0} skipped</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
                      placeholder="Address, ID, landlord..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Submarket */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Submarket</Label>
                  <Select value={submarketFilter} onValueChange={setSubmarketFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Submarkets" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Submarkets</SelectItem>
                      {uniqueSubmarkets.map(submarket => (
                        <SelectItem key={submarket} value={submarket}>{submarket}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      {uniqueStatuses.map(status => (
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
              Click "Sync Market Data" to import listings from the Vacancy_List sheet.
            </p>
            <Button onClick={syncMarketListings} disabled={isSyncing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync Market Data
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
              <MarketListingsTable 
                listings={paginatedListings} 
                onEdit={setEditingListing} 
                onRefresh={refreshListings}
              />
              
              {/* Pagination Controls */}
              <div className="flex items-center justify-between p-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredListings.length)} of {filteredListings.length} listings
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

        {/* Edit Dialog */}
        <MarketListingEditDialog
          listing={editingListing}
          open={editingListing !== null}
          onOpenChange={(open) => {
            if (!open) setEditingListing(null);
          }}
          onSaved={refreshListings}
          mode="edit"
        />

        {/* Create Dialog */}
        <MarketListingEditDialog
          listing={null}
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSaved={refreshListings}
          mode="create"
        />
      </div>
    </AppLayout>
  );
}
