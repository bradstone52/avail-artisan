import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Building2, ExternalLink } from 'lucide-react';
import { useMarketListings } from '@/hooks/useMarketListings';
import { formatNumber } from '@/lib/format';
import type { Prospect } from '@/types/prospect';

interface MatchingListingsSectionProps {
  prospect: Prospect;
}

function getSizeRange(requiredSize: number): { minSize: number; maxSize: number } | null {
  if (requiredSize >= 8000 && requiredSize < 13000) {
    // Fixed range for smaller requirements
    return { minSize: 8000, maxSize: 13000 };
  } else if (requiredSize >= 13000 && requiredSize < 20000) {
    // Min is required size, max is +5,000
    return { minSize: requiredSize, maxSize: requiredSize + 5000 };
  } else if (requiredSize >= 20000) {
    // Min is required size, max is +10,000
    return { minSize: requiredSize, maxSize: requiredSize + 10000 };
  }
  return null;
}

function hasYard(yardValue: string | null | undefined): boolean {
  if (!yardValue) return false;
  const noYardValues = ['No', 'Unknown', 'None', ''];
  return !noYardValues.includes(yardValue);
}

export function MatchingListingsSection({ prospect }: MatchingListingsSectionProps) {
  const { listings } = useMarketListings();
  const [dialogOpen, setDialogOpen] = useState(false);

  const requiredSize = prospect.max_size || 0;
  const sizeRange = getSizeRange(requiredSize);

  // Filter listings that match prospect requirements
  const matchingListings = listings?.filter((listing) => {
    // 1. Only active listings
    if (listing.status !== 'Active') return false;
    
    // 2. Must have valid size requirements on prospect
    if (!sizeRange) return false;
    
    // 3. Listing must have a size
    const listingSize = listing.size_sf || 0;
    if (listingSize === 0) return false;
    
    // 4. Listing size must fall within prospect's calculated range
    if (listingSize < sizeRange.minSize || listingSize > sizeRange.maxSize) return false;
    
    // 5. If prospect requires yard, only show listings with yard
    if (prospect.yard_required && !hasYard(listing.yard)) return false;
    
    return true;
  }) || [];

  const displayedListings = matchingListings.slice(0, 5);
  const hasMore = matchingListings.length > 5;

  const ListingItem = ({ listing }: { listing: typeof matchingListings[0] }) => (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
      <div>
        <p className="font-medium">{listing.address}</p>
        <p className="text-sm text-muted-foreground">
          {listing.city} • {formatNumber(listing.size_sf)} SF
          {listing.yard && listing.yard !== 'Unknown' && listing.yard !== 'No' && (
            <span> • Yard: {listing.yard}</span>
          )}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => window.open(`/market-listings?id=${listing.id}`, '_blank')}
      >
        <ExternalLink className="w-4 h-4" />
      </Button>
    </div>
  );

  if (matchingListings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Matching Listings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No listings match this prospect's requirements
            {sizeRange && (
              <span className="block mt-1">
                (Looking for {formatNumber(sizeRange.minSize)} - {formatNumber(sizeRange.maxSize)} SF)
              </span>
            )}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Matching Listings ({matchingListings.length})
            {sizeRange && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                {formatNumber(sizeRange.minSize)} - {formatNumber(sizeRange.maxSize)} SF
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {displayedListings.map((listing) => (
              <ListingItem key={listing.id} listing={listing} />
            ))}
            {hasMore && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => setDialogOpen(true)}
              >
                View all matching listings ({matchingListings.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              All Matching Listings ({matchingListings.length})
              {sizeRange && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {formatNumber(sizeRange.minSize)} - {formatNumber(sizeRange.maxSize)} SF
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 space-y-2 pr-2">
            {matchingListings.map((listing) => (
              <ListingItem key={listing.id} listing={listing} />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
