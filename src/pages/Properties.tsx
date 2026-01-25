import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProperties, PropertyWithLinks } from '@/hooks/useProperties';
import { PropertiesTable } from '@/components/properties/PropertiesTable';
import { PropertyEditDialog } from '@/components/properties/PropertyEditDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Building2, MapPin, RefreshCw, FileText, Download, Loader2, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { queueGlobalToast } from '@/hooks/useGlobalToast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ITEMS_PER_PAGE = 25;

export default function Properties() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { properties, loading, fetchProperties, createProperty, updateProperty, deleteProperty, linkListing, unlinkListing, importFromMarketListings } = useProperties();
  const [isImporting, setIsImporting] = useState(false);
  const [isSavingAllBrochures, setIsSavingAllBrochures] = useState(false);
  const [isFetchingCityData, setIsFetchingCityData] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('all');
  const [hasListingFilter, setHasListingFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithLinks | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Get unique filter values
  const cities = useMemo(() => 
    [...new Set(properties.map(p => p.city).filter(c => c && c.trim() !== ''))].sort(),
    [properties]
  );

  const propertyTypes = useMemo(() => 
    [...new Set(properties.map(p => p.property_type).filter(pt => pt && pt.trim() !== ''))].sort(),
    [properties]
  );

  // Filter and search
  const filteredProperties = useMemo(() => {
    return properties.filter(property => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchFields = [
          property.name,
          property.address,
          property.city,
          property.property_type,
          property.submarket
        ].filter(Boolean).map(f => f!.toLowerCase());
        
        if (!searchFields.some(f => f.includes(q))) {
          return false;
        }
      }

      // City filter
      if (cityFilter !== 'all' && property.city !== cityFilter) {
        return false;
      }

      // Property type filter
      if (propertyTypeFilter !== 'all' && property.property_type !== propertyTypeFilter) {
        return false;
      }

      // Has listing filter
      if (hasListingFilter === 'active' && (property.active_listing_count || 0) === 0) {
        return false;
      }
      if (hasListingFilter === 'none' && (property.active_listing_count || 0) > 0) {
        return false;
      }

      return true;
    });
  }, [properties, searchQuery, cityFilter, propertyTypeFilter, hasListingFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredProperties.length / ITEMS_PER_PAGE);
  const paginatedProperties = filteredProperties.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats
  const totalProperties = properties.length;
  const uniqueCities = new Set(properties.map(p => p.city).filter(Boolean)).size;
  const withActiveListings = properties.filter(p => (p.active_listing_count || 0) > 0).length;
  const uniqueTypes = new Set(properties.map(p => p.property_type).filter(Boolean)).size;

  const handleEdit = (property: PropertyWithLinks) => {
    setSelectedProperty(property);
    setIsCreating(false);
    setEditDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedProperty(null);
    setIsCreating(true);
    setEditDialogOpen(true);
  };

  const handleViewDashboard = (property: PropertyWithLinks) => {
    navigate(`/properties/${property.id}`);
  };

  const handleSave = async (property: Partial<PropertyWithLinks>) => {
    if (isCreating) {
      const created = await createProperty(property);
      if (created) {
        setEditDialogOpen(false);
        // Navigate to the new property's dashboard
        navigate(`/properties/${created.id}`);
      }
    } else if (selectedProperty) {
      await updateProperty(selectedProperty.id, property);
      setEditDialogOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteProperty(id);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCityFilter('all');
    setPropertyTypeFilter('all');
    setHasListingFilter('all');
    setCurrentPage(1);
  };

  // Save all brochures for all properties
  const handleSaveAllBrochures = async () => {
    setIsSavingAllBrochures(true);
    let saved = 0;
    let failed = 0;

    try {
      // Get all properties with linked listings that have brochure URLs
      for (const property of properties) {
        if (!property.linked_listings) continue;

        for (const listing of property.linked_listings) {
          if (!listing.link) continue;

          try {
            const { error } = await supabase.functions.invoke('download-brochure', {
              body: {
                propertyId: property.id,
                marketListingId: listing.id,
                listingId: listing.listing_id,
                brochureUrl: listing.link
              }
            });

            if (error) {
              console.error(`Error saving brochure for ${listing.listing_id}:`, error);
              failed++;
            } else {
              saved++;
            }
          } catch (err) {
            console.error(`Error saving brochure for ${listing.listing_id}:`, err);
            failed++;
          }
        }
      }

      toast({
        title: 'Brochure save complete',
        description: `Saved ${saved} brochures${failed > 0 ? `, ${failed} failed` : ''}`
      });
    } catch (error: any) {
      console.error('Error saving brochures:', error);
      toast({
        title: 'Error saving brochures',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSavingAllBrochures(false);
    }
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
            <h1 className="text-3xl font-black tracking-tight">Properties</h1>
            <p className="text-muted-foreground">
              Property catalogue with city data and historical brochures
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* City Data Fetch - runs server-side via nightly-property-sync */}
            <Button 
              variant="outline"
              onClick={async () => {
                setIsFetchingCityData(true);
                setSyncProgress(null);
                toast({
                  title: 'Sync in progress',
                  description: 'Fetching city data for all properties...'
                });
                
                try {
                  // Trigger the sync - this returns immediately
                  const { error } = await supabase.functions.invoke('nightly-property-sync');
                  
                  if (error) {
                    queueGlobalToast({
                      title: 'Sync failed',
                      description: error.message,
                      variant: 'destructive'
                    });
                    setIsFetchingCityData(false);
                    return;
                  }
                  
                  // Start polling for progress (sync runs in background via batched calls)
                  const pollInterval = setInterval(async () => {
                    const { data } = await supabase
                      .from('workspace_settings')
                      .select('value')
                      .eq('key', 'city_data_sync_progress')
                      .maybeSingle();
                    
                    if (data?.value) {
                      const progress = data.value as { current: number; total: number; status: string };
                      setSyncProgress({ current: progress.current, total: progress.total });
                      
                      if (progress.status === 'complete') {
                        clearInterval(pollInterval);
                        fetchProperties();
                        queueGlobalToast({
                          title: 'City data sync complete',
                          description: `Fetched ${progress.total} properties`
                        });
                        setIsFetchingCityData(false);
                        setSyncProgress(null);
                      } else if (progress.status === 'failed') {
                        clearInterval(pollInterval);
                        queueGlobalToast({
                          title: 'Sync failed',
                          description: 'An error occurred during sync',
                          variant: 'destructive'
                        });
                        setIsFetchingCityData(false);
                        setSyncProgress(null);
                      }
                    }
                  }, 1000);
                  
                } catch (err: any) {
                  queueGlobalToast({
                    title: 'Sync failed',
                    description: err.message,
                    variant: 'destructive'
                  });
                  setIsFetchingCityData(false);
                  setSyncProgress(null);
                }
              }}
              disabled={isFetchingCityData}
            >
              {isFetchingCityData ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {syncProgress ? `Syncing ${syncProgress.current}/${syncProgress.total}` : 'Starting...'}
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Fetch All City Data
                </>
              )}
            </Button>
            <Button 
              variant="outline"
              onClick={handleSaveAllBrochures}
              disabled={isSavingAllBrochures}
            >
              {isSavingAllBrochures ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Save All Brochures
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={async () => {
                setIsImporting(true);
                await importFromMarketListings();
                setIsImporting(false);
              }}
              disabled={isImporting}
            >
              {isImporting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync Market Listings
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Property
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
                  <p className="text-2xl font-bold">{totalProperties}</p>
                  <p className="text-xs text-muted-foreground">Total Properties</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <MapPin className="h-5 w-5 text-secondary-foreground" />
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
                <div className="p-2 bg-accent/10 rounded-lg">
                  <FileText className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{uniqueTypes}</p>
                  <p className="text-xs text-muted-foreground">Property Types</p>
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
                  placeholder="Search properties..."
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
            Showing {paginatedProperties.length} of {filteredProperties.length} properties
          </span>
        </div>

        {/* Table */}
        <PropertiesTable
          properties={paginatedProperties}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewDashboard={handleViewDashboard}
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
        <PropertyEditDialog
          property={selectedProperty}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={handleSave}
          mode={isCreating ? 'create' : 'edit'}
        />
      </div>
    </AppLayout>
  );
}
