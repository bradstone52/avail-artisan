import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, ExternalLink } from 'lucide-react';
import { useMarketListings } from '@/hooks/useMarketListings';
import { formatNumber } from '@/lib/format';
import type { Prospect } from '@/types/prospect';

interface MatchingListingsSectionProps {
  prospect: Prospect;
}

export function MatchingListingsSection({ prospect }: MatchingListingsSectionProps) {
  const { listings } = useMarketListings();

  // Filter listings that match prospect requirements
  const matchingListings = listings?.filter((listing) => {
    if (listing.status !== 'Active') return false;
    
    const size = listing.size_sf || 0;
    const minSize = prospect.min_size || 0;
    const maxSize = prospect.max_size || Infinity;
    
    return size >= minSize && size <= maxSize;
  }) || [];

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
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Matching Listings ({matchingListings.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {matchingListings.slice(0, 5).map((listing) => (
            <div
              key={listing.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
            >
              <div>
                <p className="font-medium">{listing.address}</p>
                <p className="text-sm text-muted-foreground">
                  {listing.city} • {formatNumber(listing.size_sf)} SF
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
          ))}
          {matchingListings.length > 5 && (
            <p className="text-sm text-muted-foreground text-center pt-2">
              +{matchingListings.length - 5} more listings
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
