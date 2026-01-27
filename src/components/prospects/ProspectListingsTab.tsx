import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, ExternalLink } from 'lucide-react';
import { useMarketListings } from '@/hooks/useMarketListings';
import { formatNumber } from '@/lib/format';
import type { Prospect } from '@/types/prospect';

interface ProspectListingsTabProps {
  prospect: Prospect;
}

export function ProspectListingsTab({ prospect }: ProspectListingsTabProps) {
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
      <div className="text-center py-8 text-muted-foreground">
        No listings match this prospect's requirements.
        {prospect.min_size || prospect.max_size ? (
          <p className="text-sm mt-2">
            Size range: {prospect.min_size ? formatNumber(prospect.min_size) : '0'} - {prospect.max_size ? formatNumber(prospect.max_size) : '∞'} SF
          </p>
        ) : (
          <p className="text-sm mt-2">
            Set size requirements to see matching listings.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {matchingListings.length} listings match this prospect's requirements
        {(prospect.min_size || prospect.max_size) && (
          <span>
            {' '}({prospect.min_size ? formatNumber(prospect.min_size) : '0'} - {prospect.max_size ? formatNumber(prospect.max_size) : '∞'} SF)
          </span>
        )}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {matchingListings.map((listing) => (
          <Card key={listing.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{listing.address}</h4>
                  <p className="text-sm text-muted-foreground">
                    {listing.city}{listing.submarket && ` • ${listing.submarket}`}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span>{formatNumber(listing.size_sf)} SF</span>
                    {listing.asking_rate_psf && (
                      <span>${listing.asking_rate_psf}/SF</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.open(`/market-listings?id=${listing.id}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
