import { AppLayout } from '@/components/layout/AppLayout';
import { DistributionListingsTable } from '@/components/listings/DistributionListingsTable';
import { useDistributionListings } from '@/hooks/useDistributionListings';
import { RefreshCw, FileSpreadsheet, AlertCircle } from 'lucide-react';

export default function Listings() {
  const { 
    listings, 
    loading, 
    refreshListings,
  } = useDistributionListings();

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
            <h1 className="text-2xl font-display font-bold">Distribution Listings</h1>
            <p className="text-muted-foreground mt-1">
              {listings.length} active distribution warehouse properties
            </p>
          </div>
        </div>

        {/* Content */}
        {listings.length === 0 ? (
          <div className="text-center py-16 bg-muted/30 rounded-xl border border-dashed border-border">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-display font-semibold mb-2">No Distribution Listings</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              No active listings are marked as distribution warehouses. 
              Update listings in Market Listings to mark them as distribution warehouses.
            </p>
          </div>
        ) : (
          <DistributionListingsTable 
            listings={listings} 
            onListingUpdated={refreshListings}
          />
        )}
      </div>
    </AppLayout>
  );
}
