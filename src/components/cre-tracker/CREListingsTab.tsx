import * as React from 'react';
import { Button } from '@/components/ui/button';
import { InternalListingsTable } from '@/components/internal-listings/InternalListingsTable';
import { InternalListingEditDialog } from '@/components/internal-listings/InternalListingEditDialog';
import { InternalListingFilters, ListingFilters } from '@/components/internal-listings/InternalListingFilters';
import { useInternalListings, InternalListing, InternalListingFormData } from '@/hooks/useInternalListings';
import { Plus } from 'lucide-react';

export function CREListingsTab() {
  const { listings, isLoading, createListing, updateListing, deleteListing } = useInternalListings();
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [selectedListing, setSelectedListing] = React.useState<InternalListing | null>(null);
  const [filters, setFilters] = React.useState<ListingFilters>({
    search: '', status: '', propertyType: '', dealType: '', agentId: '', city: '', minSize: undefined, maxSize: undefined,
  });

  const filteredListings = React.useMemo(() => {
    return listings.filter((listing) => {
      if (filters.search) {
        const s = filters.search.toLowerCase();
        if (!(listing.address.toLowerCase().includes(s) || listing.display_address?.toLowerCase().includes(s) || listing.city.toLowerCase().includes(s) || listing.listing_number?.toLowerCase().includes(s))) return false;
      }
      if (filters.status && listing.status !== filters.status) return false;
      if (filters.propertyType && listing.property_type !== filters.propertyType) return false;
      if (filters.dealType && listing.deal_type !== filters.dealType) return false;
      if (filters.agentId && listing.assigned_agent_id !== filters.agentId) return false;
      if (filters.city && !listing.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
      if (filters.minSize && (listing.size_sf ?? 0) < filters.minSize) return false;
      if (filters.maxSize && (listing.size_sf ?? 0) > filters.maxSize) return false;
      return true;
    });
  }, [listings, filters]);

  const handleCreate = () => { setSelectedListing(null); setEditDialogOpen(true); };
  const handleEdit = (listing: InternalListing) => { setSelectedListing(listing); setEditDialogOpen(true); };
  const handleSubmit = (data: InternalListingFormData) => {
    if (selectedListing) {
      updateListing.mutate({ id: selectedListing.id, ...data }, { onSuccess: () => setEditDialogOpen(false) });
    } else {
      createListing.mutate(data, { onSuccess: () => setEditDialogOpen(false) });
    }
  };
  const handleDelete = (id: string) => { deleteListing.mutate(id); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleCreate}><Plus className="w-4 h-4 mr-2" />New Listing</Button>
      </div>
      <InternalListingFilters filters={filters} onFiltersChange={setFilters} />
      <InternalListingsTable listings={filteredListings} onEdit={handleEdit} onDelete={handleDelete} isDeleting={deleteListing.isPending} />
      <InternalListingEditDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} listing={selectedListing} onSubmit={handleSubmit} isSubmitting={createListing.isPending || updateListing.isPending} />
    </div>
  );
}
