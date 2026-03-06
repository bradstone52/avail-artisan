import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Trash2, Loader2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MarketListing } from '@/hooks/useMarketListings';
import { formatSubmarket } from '@/lib/formatters';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

/**
 * Normalize an address for duplicate comparison.
 * Uses display_address (which includes lot/unit detail) when available,
 * then strips building/unit/suite suffixes so minor formatting differences
 * collapse — e.g. "11500 Barlow Trail NE - Building B - Unit 140" matches
 * "11500 Barlow Trail NE - Unit 140".
 *
 * Does NOT strip "lot" because lot numbers typically represent distinct parcels.
 */
export function normalizeAddressForDupeCheck(listing: { address: string; display_address?: string | null }): string {
  // Prefer display_address — it includes unit/building detail that makes
  // each unit a distinct listing (e.g. "Building 2 — Unit B" vs "Unit J").
  const raw = (listing.display_address || listing.address || '');
  let s = raw.toLowerCase().trim();

  // Normalise em-dashes / en-dashes to regular hyphens so formatting
  // differences don't prevent matching truly identical addresses.
  s = s.replace(/[—–]/g, '-');

  // Collapse whitespace and trim trailing hyphens / spaces only.
  // Do NOT strip unit/building/suite/bay identifiers — they distinguish
  // independent units from one another and must be preserved.
  return s.replace(/\s+/g, ' ').replace(/[\s-]+$/, '').trim();
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listings: MarketListing[];
  onListingUpdated: () => void;
  onFilterByAddress?: (address: string) => void;
}

export function DuplicateListingsDialog({ open, onOpenChange, listings, onListingUpdated, onFilterByAddress }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MarketListing | null>(null);

  // Group by normalized (display_address || address) + size to find duplicates
  const duplicateGroups = useMemo(() => {
    const groups = new Map<string, MarketListing[]>();
    
    for (const listing of listings) {
      const addr = normalizeAddressForDupeCheck(listing);
      if (!addr) continue;

      const key = `${addr}||${listing.size_sf ?? ''}||${listing.land_acres ?? ''}||${listing.listing_type ?? ''}`;
      
      const existing = groups.get(key) || [];
      existing.push(listing);
      groups.set(key, existing);
    }

    // Only keep groups with 2+ listings
    const dupes: { address: string; size_sf: number | null; listings: MarketListing[] }[] = [];
    for (const [, group] of groups) {
      if (group.length >= 2) {
        dupes.push({
          address: group[0].display_address || group[0].address,
          size_sf: group[0].size_sf,
          listings: group,
        });
      }
    }

    // Sort by group size descending
    dupes.sort((a, b) => b.listings.length - a.listings.length);
    return dupes;
  }, [listings]);

  const totalDuplicates = duplicateGroups.reduce((sum, g) => sum + g.listings.length - 1, 0);

  const handleDelete = async (listing: MarketListing) => {
    setDeletingId(listing.id);
    try {
      const { error } = await supabase
        .from('market_listings')
        .delete()
        .eq('id', listing.id);
      
      if (error) throw error;
      toast.success(`Deleted: ${listing.display_address || listing.address}`);
      onListingUpdated();
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Failed to delete listing');
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const handleViewInTable = (address: string) => {
    onFilterByAddress?.(address);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5" />
              Duplicate Listings
            </DialogTitle>
            <DialogDescription>
              {duplicateGroups.length === 0 
                ? 'No duplicate addresses found.'
                : `${duplicateGroups.length} groups with duplicates (${totalDuplicates} extra entries). Matched by normalized address + size + acreage + listing type.`
              }
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4">
              {duplicateGroups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No duplicates detected! 🎉
                </div>
              ) : (
                duplicateGroups.map((group, gi) => (
                  <div key={gi} className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-3 py-2 border-b flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{group.address}</span>
                      {group.size_sf != null && (
                        <span className="text-xs text-muted-foreground">({group.size_sf.toLocaleString()} SF)</span>
                      )}
                      <Badge variant="outline" className="text-xs">{group.listings.length}x</Badge>
                      {onFilterByAddress && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs ml-auto gap-1"
                          onClick={() => handleViewInTable(group.listings[0].address)}
                        >
                          <Search className="w-3 h-3" />
                          View in Table
                        </Button>
                      )}
                    </div>
                    <div className="divide-y">
                      {group.listings.map((listing) => (
                        <div
                          key={listing.id}
                          className="flex items-start gap-3 px-3 py-2.5 hover:bg-accent/30 transition-colors"
                        >
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="text-sm font-medium truncate">
                              {listing.display_address || listing.address}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                              <Badge variant={listing.status === 'Active' ? 'default' : 'secondary'} className="text-[10px] h-4">
                                {listing.status}
                              </Badge>
                              <span>{listing.size_sf?.toLocaleString()} SF</span>
                              <span className="text-muted-foreground/50">•</span>
                              <span>{formatSubmarket(listing.submarket)}</span>
                              {listing.listing_type && (
                                <>
                                  <span className="text-muted-foreground/50">•</span>
                                  <span>{listing.listing_type}</span>
                                </>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                              {listing.listing_id && (
                                <span className="font-mono">ID: {listing.listing_id}</span>
                              )}
                              {listing.landlord && (
                                <>
                                  <span className="text-muted-foreground/50">•</span>
                                  <span>Landlord: {listing.landlord}</span>
                                </>
                              )}
                              {listing.broker_source && (
                                <>
                                  <span className="text-muted-foreground/50">•</span>
                                  <span>Source: {listing.broker_source}</span>
                                </>
                              )}
                              {listing.asking_rate_psf && (
                                <>
                                  <span className="text-muted-foreground/50">•</span>
                                  <span>Rate: {listing.asking_rate_psf}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive shrink-0 mt-0.5"
                            onClick={() => setConfirmDelete(listing)}
                            disabled={deletingId === listing.id}
                          >
                            {deletingId === listing.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
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

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}
        title="Delete Listing"
        description={`Delete "${confirmDelete?.display_address || confirmDelete?.address}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />
    </>
  );
}
