import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAssets, AssetWithLinks } from '@/hooks/useAssets';
import { AssetsTable } from '@/components/assets/AssetsTable';
import { AssetEditDialog } from '@/components/assets/AssetEditDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Building2, Users, MapPin, RefreshCw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ITEMS_PER_PAGE = 25;

export default function Assets() {
  const { assets, loading, fetchAssets, createAsset, updateAsset, deleteAsset, linkListing, unlinkListing } = useAssets();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [hasListingFilter, setHasListingFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetWithLinks | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Get unique filter values
  const cities = useMemo(() => 
    [...new Set(assets.map(a => a.city).filter(c => c && c.trim() !== ''))].sort(),
    [assets]
  );

  const propertyTypes = useMemo(() => 
    [...new Set(assets.map(a => a.property_type).filter(pt => pt && pt.trim() !== ''))].sort(),
    [assets]
  );

  const owners = useMemo(() => 
    [...new Set(assets.map(a => a.owner_company || a.owner_name).filter(o => o && o.trim() !== ''))].sort(),
    [assets]
  );

  // Filter and search
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchFields = [
          asset.name,
          asset.address,
          asset.city,
          asset.owner_name,
          asset.owner_company,
          asset.property_type
        ].filter(Boolean).map(f => f!.toLowerCase());
        
        if (!searchFields.some(f => f.includes(q))) {
          return false;
        }
      }

      // City filter
      if (cityFilter !== 'all' && asset.city !== cityFilter) {
        return false;
      }

      // Property type filter
      if (propertyTypeFilter !== 'all' && asset.property_type !== propertyTypeFilter) {
        return false;
      }

      // Owner filter
      if (ownerFilter !== 'all') {
        const assetOwner = asset.owner_company || asset.owner_name;
        if (assetOwner !== ownerFilter) {
          return false;
        }
      }

      // Has listing filter
      if (hasListingFilter === 'active' && (asset.active_listing_count || 0) === 0) {
        return false;
      }
      if (hasListingFilter === 'none' && (asset.active_listing_count || 0) > 0) {
        return false;
      }

      return true;
    });
  }, [assets, searchQuery, cityFilter, propertyTypeFilter, ownerFilter, hasListingFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredAssets.length / ITEMS_PER_PAGE);
  const paginatedAssets = filteredAssets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats
  const totalAssets = assets.length;
  const uniqueOwners = new Set(assets.map(a => a.owner_company || a.owner_name).filter(Boolean)).size;
  const uniqueCities = new Set(assets.map(a => a.city).filter(Boolean)).size;
  const withActiveListings = assets.filter(a => (a.active_listing_count || 0) > 0).length;

  const handleEdit = (asset: AssetWithLinks) => {
    setSelectedAsset(asset);
    setIsCreating(false);
    setEditDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedAsset(null);
    setIsCreating(true);
    setEditDialogOpen(true);
  };

  const handleSave = async (asset: Partial<AssetWithLinks>) => {
    if (isCreating) {
      await createAsset(asset);
    } else if (selectedAsset) {
      await updateAsset(selectedAsset.id, asset);
    }
    setEditDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteAsset(id);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCityFilter('all');
    setPropertyTypeFilter('all');
    setOwnerFilter('all');
    setHasListingFilter('all');
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Owners/Assets</h1>
            <p className="text-muted-foreground">
              Catalogue of real estate assets and their owners
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => fetchAssets()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Asset
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalAssets}</p>
                  <p className="text-xs text-muted-foreground">Total Assets</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <Users className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{uniqueOwners}</p>
                  <p className="text-xs text-muted-foreground">Unique Owners</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <MapPin className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{uniqueCities}</p>
                  <p className="text-xs text-muted-foreground">Cities</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Building2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{withActiveListings}</p>
                  <p className="text-xs text-muted-foreground">With Active Listings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {propertyTypes.map(type => (
                    <SelectItem key={type} value={type!}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Owners</SelectItem>
                  {owners.map(owner => (
                    <SelectItem key={owner} value={owner!}>{owner}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={hasListingFilter} onValueChange={setHasListingFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Listings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">With Active Listings</SelectItem>
                  <SelectItem value="none">No Active Listings</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="ghost" onClick={clearFilters} size="sm">
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results count */}
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>
            Showing {paginatedAssets.length} of {filteredAssets.length} assets
          </span>
        </div>

        {/* Table */}
        <AssetsTable
          assets={paginatedAssets}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onLinkListing={linkListing}
          onUnlinkListing={unlinkListing}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="flex items-center px-4 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}

        {/* Edit Dialog */}
        <AssetEditDialog
          asset={selectedAsset}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={handleSave}
          mode={isCreating ? 'create' : 'edit'}
        />
      </div>
    </AppLayout>
  );
}
