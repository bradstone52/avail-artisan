import { useState, useEffect, useMemo } from 'react';
import { AssetWithLinks } from '@/hooks/useAssets';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Link as LinkIcon, Unlink, ExternalLink, Loader2 } from 'lucide-react';

interface MarketListingOption {
  id: string;
  listing_id: string;
  address: string;
  status: string;
  size_sf: number;
}

interface LinkListingDialogProps {
  asset: AssetWithLinks | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLink: (assetId: string, marketListingId: string) => Promise<boolean>;
  onUnlink: (assetId: string, marketListingId: string) => Promise<boolean>;
}

export function LinkListingDialog({
  asset,
  open,
  onOpenChange,
  onLink,
  onUnlink
}: LinkListingDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [marketListings, setMarketListings] = useState<MarketListingOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch market listings
  useEffect(() => {
    if (open) {
      setLoading(true);
      supabase
        .from('market_listings')
        .select('id, listing_id, address, status, size_sf')
        .order('address')
        .then(({ data }) => {
          setMarketListings(data || []);
          setLoading(false);
        });
    }
  }, [open]);

  // Get currently linked listing IDs (manual links only)
  const manualLinkedIds = useMemo(() => {
    if (!asset?.linked_listings) return new Set<string>();
    return new Set(
      asset.linked_listings
        .filter(l => l.link_type === 'manual')
        .map(l => l.id)
    );
  }, [asset]);

  // Get auto-linked IDs
  const autoLinkedIds = useMemo(() => {
    if (!asset?.linked_listings) return new Set<string>();
    return new Set(
      asset.linked_listings
        .filter(l => l.link_type === 'auto')
        .map(l => l.id)
    );
  }, [asset]);

  // Filter listings by search
  const filteredListings = useMemo(() => {
    if (!searchQuery.trim()) return marketListings;
    const q = searchQuery.toLowerCase();
    return marketListings.filter(l => 
      l.listing_id.toLowerCase().includes(q) ||
      l.address.toLowerCase().includes(q)
    );
  }, [marketListings, searchQuery]);

  const handleLink = async (listingId: string) => {
    if (!asset) return;
    setActionLoading(listingId);
    await onLink(asset.id, listingId);
    setActionLoading(null);
  };

  const handleUnlink = async (listingId: string) => {
    if (!asset) return;
    setActionLoading(listingId);
    await onUnlink(asset.id, listingId);
    setActionLoading(null);
  };

  const formatSF = (sf: number) => sf?.toLocaleString() + ' SF' || '-';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800 border-green-300';
      case 'Under Contract': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Sold/Leased': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Manage Listing Links
          </DialogTitle>
          <DialogDescription>
            {asset?.name} — {asset?.address}
          </DialogDescription>
        </DialogHeader>

        {/* Current Links */}
        {asset?.linked_listings && asset.linked_listings.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Currently Linked</h4>
            <div className="space-y-2">
              {asset.linked_listings.map(listing => (
                <div 
                  key={listing.id}
                  className="flex items-center justify-between p-2 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Badge variant="outline" className={getStatusColor(listing.status)}>
                      {listing.status}
                    </Badge>
                    <span className="font-mono text-sm">{listing.listing_id}</span>
                    <span className="text-sm text-muted-foreground truncate">
                      {listing.address}
                    </span>
                    {listing.link_type === 'auto' && (
                      <Badge variant="secondary" className="text-xs">auto</Badge>
                    )}
                  </div>
                  {listing.link_type === 'manual' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnlink(listing.id)}
                      disabled={actionLoading === listing.id}
                    >
                      {actionLoading === listing.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Unlink className="h-4 w-4" />
                      )}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground px-2">
                      Address match
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search listings by ID or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Available Listings */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Available Listings</h4>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-1">
                {filteredListings.map(listing => {
                  const isManualLinked = manualLinkedIds.has(listing.id);
                  const isAutoLinked = autoLinkedIds.has(listing.id);
                  const isLinked = isManualLinked || isAutoLinked;

                  return (
                    <div
                      key={listing.id}
                      className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                        isLinked 
                          ? 'bg-primary/5 border-primary/20' 
                          : 'hover:bg-muted border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Badge 
                          variant="outline" 
                          className={getStatusColor(listing.status)}
                        >
                          {listing.status}
                        </Badge>
                        <span className="font-mono text-sm font-medium">
                          {listing.listing_id}
                        </span>
                        <span className="text-sm text-muted-foreground truncate flex-1">
                          {listing.address}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatSF(listing.size_sf)}
                        </span>
                      </div>
                      {isAutoLinked ? (
                        <Badge variant="secondary" className="text-xs">
                          Auto-linked
                        </Badge>
                      ) : isManualLinked ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnlink(listing.id)}
                          disabled={actionLoading === listing.id}
                        >
                          {actionLoading === listing.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Unlink className="h-4 w-4 mr-1" />
                              Unlink
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLink(listing.id)}
                          disabled={actionLoading === listing.id}
                        >
                          {actionLoading === listing.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <LinkIcon className="h-4 w-4 mr-1" />
                              Link
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
                {filteredListings.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No listings found matching your search.
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
