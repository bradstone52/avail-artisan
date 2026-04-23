import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProperties, PropertyWithLinks } from '@/hooks/useProperties';
import { PropertiesTable } from '@/components/properties/PropertiesTable';
import { PropertyEditDialog } from '@/components/properties/PropertyEditDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Building2, MapPin, RefreshCw, FileText, Map, AlertTriangle, Wrench } from 'lucide-react';
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
  const { properties, loading, createProperty, updateProperty, deleteProperty, linkListing, unlinkListing } = useProperties();
  const [needsReviewFilter, setNeedsReviewFilter] = useState(false);
  
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

      // Needs review filter - Calgary properties with city_data_fetched_at but no roll_number
      if (needsReviewFilter) {
        const isCalgary = property.city?.toLowerCase().includes('calgary');
        const hasCityDataFetched = !!(property as any).city_data_fetched_at;
        const noRollNumber = !(property as any).roll_number;
        if (!(isCalgary && hasCityDataFetched && noRollNumber)) {
          return false;
        }
      }

      return true;
    });
  }, [properties, searchQuery, cityFilter, propertyTypeFilter, hasListingFilter, needsReviewFilter]);

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
    setNeedsReviewFilter(false);
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
            <h1 className="text-3xl font-black tracking-tight">Properties</h1>
            <p className="text-muted-foreground">
              Property catalogue with city data and historical brochures
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/properties/admin')}
            >
              <Wrench className="h-4 w-4 mr-2" />
              Tools
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/properties/map')}
            >
              <Map className="h-4 w-4 mr-2" />
              Map View
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

              <Button 
                variant={needsReviewFilter ? "default" : "outline"}
                size="sm"
                onClick={() => setNeedsReviewFilter(!needsReviewFilter)}
                className={needsReviewFilter ? "bg-amber-600 hover:bg-amber-700" : ""}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Needs Review
              </Button>

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
