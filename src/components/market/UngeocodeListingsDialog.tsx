import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Loader2, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MarketListing } from '@/hooks/useMarketListings';
import { formatSubmarket } from '@/lib/formatters';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listings: MarketListing[];
  onListingUpdated: () => void;
}

export function UngeocodeListingsDialog({ open, onOpenChange, listings, onListingUpdated }: Props) {
  const { session } = useAuth();
  const [geocodingId, setGeocodingId] = useState<string | null>(null);
  const [batchGeocoding, setBatchGeocoding] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);

  const ungeocoded = listings.filter(l => !l.latitude || !l.longitude);

  const handleAutoGeocode = async (listing: MarketListing) => {
    const accessToken = session?.access_token;
    if (!accessToken) { toast.error('Not authenticated'); return; }

    setGeocodingId(listing.id);
    try {
      const { data, error } = await supabase.functions.invoke('geocode-market-listing', {
        headers: { Authorization: `Bearer ${accessToken}` },
        body: { listingId: listing.listing_id || listing.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.geocoded) toast.success(`Geocoded: ${listing.display_address || listing.address}`);
      else toast.message(data?.message || 'No changes');
      onListingUpdated();
    } catch (err) {
      console.error('Failed to auto-geocode:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to auto-geocode');
    } finally {
      setGeocodingId(null);
    }
  };

  const handleBatchGeocode = async () => {
    const accessToken = session?.access_token;
    if (!accessToken) { toast.error('Not authenticated'); return; }

    setBatchGeocoding(true);
    setBatchProgress(0);
    let success = 0;
    let failed = 0;

    for (let i = 0; i < ungeocoded.length; i++) {
      const listing = ungeocoded[i];
      try {
        const { data, error } = await supabase.functions.invoke('geocode-market-listing', {
          headers: { Authorization: `Bearer ${accessToken}` },
          body: { listingId: listing.listing_id || listing.id },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (data?.geocoded) success++;
      } catch {
        failed++;
      }
      setBatchProgress(i + 1);
    }

    toast.success(`Geocoded ${success} of ${ungeocoded.length}${failed ? `, ${failed} failed` : ''}`);
    setBatchGeocoding(false);
    setBatchProgress(0);
    onListingUpdated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Ungeocoded Listings ({ungeocoded.length})
          </DialogTitle>
          <DialogDescription>
            These listings don't have map coordinates yet.
          </DialogDescription>
        </DialogHeader>

        {ungeocoded.length > 0 && (
          <div className="flex items-center gap-2 pb-2">
            <Button
              size="sm"
              onClick={handleBatchGeocode}
              disabled={batchGeocoding}
            >
              {batchGeocoding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {batchProgress} / {ungeocoded.length}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Geocode All ({ungeocoded.length})
                </>
              )}
            </Button>
          </div>
        )}

        <ScrollArea className="h-[50vh] pr-4">
          <div className="space-y-2">
            {ungeocoded.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                All listings are geocoded! 🎉
              </div>
            ) : (
              ungeocoded.map((listing) => (
                <div
                  key={listing.id}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm truncate block">
                      {listing.display_address || listing.address}
                    </span>
                    <div className="text-xs text-muted-foreground">
                      {formatSubmarket(listing.submarket)} • {listing.city} • {listing.size_sf?.toLocaleString()} SF
                      {listing.broker_source && ` • ${listing.broker_source}`}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs shrink-0"
                    onClick={() => handleAutoGeocode(listing)}
                    disabled={geocodingId === listing.id || batchGeocoding}
                  >
                    {geocodingId === listing.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <MapPin className="w-3 h-3 mr-1" />
                        Geocode
                      </>
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end items-center pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
