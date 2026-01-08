import { AppLayout } from '@/components/layout/AppLayout';
import { ListingsTable } from '@/components/listings/ListingsTable';
import { useSheetConnection } from '@/hooks/useSheetConnection';
import { Button } from '@/components/ui/button';
import { RefreshCw, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Listing } from '@/lib/types';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function Listings() {
  const navigate = useNavigate();
  const { 
    connection, 
    listings, 
    loading, 
    isSyncing, 
    syncListings, 
    refreshListings 
  } = useSheetConnection();

  const handleToggleInclude = async (listing: Listing) => {
    try {
      await supabase
        .from('listings')
        .update({ include_in_issue: !listing.include_in_issue })
        .eq('id', listing.id);
      
      await refreshListings();
    } catch (error) {
      toast.error('Failed to update listing');
    }
  };

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
            <h1 className="text-2xl font-display font-bold">Listings</h1>
            <p className="text-muted-foreground mt-1">
              {listings.length} properties from your connected sheet
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={syncListings}
              disabled={!connection || isSyncing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync'}
            </Button>
          </div>
        </div>

        {/* Content */}
        {!connection ? (
          <div className="text-center py-16 bg-muted/30 rounded-xl border border-dashed border-border">
            <FileSpreadsheet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-display font-semibold mb-2">No Sheet Connected</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Connect a Google Sheet from the dashboard to import your distribution listings.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 bg-muted/30 rounded-xl border border-dashed border-border">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-display font-semibold mb-2">No Listings Found</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Your connected sheet appears to be empty or the data couldn't be parsed.
              Try syncing again or check your sheet format.
            </p>
            <Button onClick={syncListings} disabled={isSyncing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync Listings
            </Button>
          </div>
        ) : (
          <ListingsTable 
            listings={listings} 
            onToggleInclude={handleToggleInclude}
          />
        )}
      </div>
    </AppLayout>
  );
}
