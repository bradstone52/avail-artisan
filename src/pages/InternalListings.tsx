import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { InternalListingsTable } from '@/components/internal-listings/InternalListingsTable';
import { InternalListingEditDialog } from '@/components/internal-listings/InternalListingEditDialog';
import {
  InternalListingFilters,
  ListingFilters,
} from '@/components/internal-listings/InternalListingFilters';
import {
  useInternalListings,
  InternalListing,
  InternalListingFormData,
} from '@/hooks/useInternalListings';
import { Plus, Building2, TrendingUp, Clock, CheckCircle } from 'lucide-react';

export default function InternalListings() {
  const { listings, isLoading, createListing, updateListing, deleteListing } =
    useInternalListings();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<InternalListing | null>(null);
  const [filters, setFilters] = useState<ListingFilters>({
    search: '',
    status: '',
    propertyType: '',
    dealType: '',
    agentId: '',
    city: '',
    minSize: undefined,
    maxSize: undefined,
  });

  // Apply filters
  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          listing.address.toLowerCase().includes(searchLower) ||
          listing.display_address?.toLowerCase().includes(searchLower) ||
          listing.city.toLowerCase().includes(searchLower) ||
          listing.listing_number?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status && listing.status !== filters.status) return false;

      // Property type filter
      if (filters.propertyType && listing.property_type !== filters.propertyType)
        return false;

      // Deal type filter
      if (filters.dealType && listing.deal_type !== filters.dealType) return false;

      // Agent filter
      if (filters.agentId && listing.assigned_agent_id !== filters.agentId)
        return false;

      // City filter
      if (
        filters.city &&
        !listing.city.toLowerCase().includes(filters.city.toLowerCase())
      )
        return false;

      // Size range filter
      if (filters.minSize && (listing.size_sf ?? 0) < filters.minSize) return false;
      if (filters.maxSize && (listing.size_sf ?? 0) > filters.maxSize) return false;

      return true;
    });
  }, [listings, filters]);

  // Stats
  const stats = useMemo(() => {
    const active = listings.filter((l) => l.status === 'Active').length;
    const pending = listings.filter((l) => l.status === 'Pending').length;
    const closed = listings.filter(
      (l) => l.status === 'Leased' || l.status === 'Sold'
    ).length;
    return { total: listings.length, active, pending, closed };
  }, [listings]);

  const handleCreate = () => {
    setSelectedListing(null);
    setEditDialogOpen(true);
  };

  const handleEdit = (listing: InternalListing) => {
    setSelectedListing(listing);
    setEditDialogOpen(true);
  };

  const handleSubmit = (data: InternalListingFormData) => {
    if (selectedListing) {
      updateListing.mutate(
        { id: selectedListing.id, ...data },
        { onSuccess: () => setEditDialogOpen(false) }
      );
    } else {
      createListing.mutate(data, { onSuccess: () => setEditDialogOpen(false) });
    }
  };

  const handleDelete = (id: string) => {
    deleteListing.mutate(id);
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader
          title="Internal Listings"
          description="Manage your brokerage's exclusive property listings"
          actions={
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              New Listing
            </Button>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.closed}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Closed
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <InternalListingFilters filters={filters} onFiltersChange={setFilters} />

        {/* Table */}
        <InternalListingsTable
          listings={filteredListings}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isDeleting={deleteListing.isPending}
        />

        {/* Edit/Create Dialog */}
        <InternalListingEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          listing={selectedListing}
          onSubmit={handleSubmit}
          isSubmitting={createListing.isPending || updateListing.isPending}
        />
      </div>
    </AppLayout>
  );
}
