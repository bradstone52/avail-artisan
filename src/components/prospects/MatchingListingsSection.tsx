import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { useMarketListings } from '@/hooks/useMarketListings';
import { formatNumber } from '@/lib/format';
import type { Prospect } from '@/types/prospect';

interface MatchingListingsSectionProps {
  prospect: Prospect;
}

function getSizeRange(requiredSize: number): { minSize: number; maxSize: number } | null {
  if (requiredSize >= 8000 && requiredSize < 13000) {
    return { minSize: 8000, maxSize: 13000 };
  } else if (requiredSize >= 13000 && requiredSize < 20000) {
    return { minSize: 13000, maxSize: requiredSize + 5000 };
  } else if (requiredSize >= 20000) {
    return { minSize: 20000, maxSize: requiredSize + 10000 };
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
  const [isExpanded, setIsExpanded] = useState(false);

  const requiredSize = prospect.max_size || 0;
  const sizeRange = getSizeRange(requiredSize);

  // Filter listings that match prospect requirements
  const matchingListings = listings?.filter((listing) => {
    // Status check
    if (listing.status !== 'Active') return false;
    
    // Size range check
    if (!sizeRange) return false;
    const size = listing.size_sf || 0;
    if (size < sizeRange.minSize || size > sizeRange.maxSize) return false;
    
    // Yard filter - only apply if prospect requires yard
    if (prospect.yard_required) {
      if (!hasYard(listing.yard)) return false;
    }
    
    return true;
  }) || [];

  const displayedListings = isExpanded ? matchingListings : matchingListings.slice(0, 5);
  const hasMore = matchingListings.length > 5;

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
          {displayedListings.map((listing) => (
            <div
              key={listing.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
            >
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
          ))}
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  View all matching listings ({matchingListings.length - 5} more)
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
