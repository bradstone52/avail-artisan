import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MarketListing } from '@/hooks/useMarketListings';
import { formatSubmarket } from '@/lib/formatters';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listings: MarketListing[];
  onListingUpdated: () => void;
}

export function DuplicateListingsDialog({ open, onOpenChange, listings, onListingUpdated }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MarketListing | null>(null);

  // Group by normalized address to find duplicates
  const duplicateGroups = useMemo(() => {
    const groups = new Map<string, MarketListing[]>();
    
    for (const listing of listings) {
      // Normalize: lowercase, trim, collapse whitespace
      const addr = (listing.address || '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
      
      if (!addr) continue;

      // Key on address + size to distinguish unique units at the same building
      const key = `${addr}||${listing.size_sf ?? ''}`;
      
      const existing = groups.get(key) || [];
      existing.push(listing);
      groups.set(key, existing);
    }

    // Only keep groups with 2+ listings
    const dupes: { address: string; size_sf: number | null; listings: MarketListing[] }[] = [];
    for (const [, group] of groups) {
      if (group.length >= 2) {
        dupes.push({ address: group[0].display_address || group[0].address, size_sf: group[0].size_sf, listings: group });
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5" />
              Duplicate Listings
            </DialogTitle>
            <DialogDescription>
              {duplicateGroups.length === 0 
                ? 'No duplicate addresses found.'
                : `${duplicateGroups.length} addresses with duplicates (${totalDuplicates} extra entries)`
              }
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[55vh] pr-4">
            <div className="space-y-4">
              {duplicateGroups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No duplicates detected! 🎉
                </div>
              ) : (
                duplicateGroups.map((group) => (
                  <div key={group.address} className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-3 py-2 border-b flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{group.listings[0].display_address || group.listings[0].address}</span>
                      {group.size_sf != null && (
                        <span className="text-xs text-muted-foreground">({group.size_sf.toLocaleString()} SF)</span>
                      )}
                      <Badge variant="outline" className="text-xs">{group.listings.length}x</Badge>
                    </div>
                    <div className="divide-y">
                      {group.listings.map((listing) => (
                        <div
                          key={listing.id}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-accent/30 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                              <span>ID: {listing.listing_id || '—'}</span>
                              <span>•</span>
                              <span>{formatSubmarket(listing.submarket)}</span>
                              <span>•</span>
                              <span>{listing.size_sf?.toLocaleString()} SF</span>
                              {listing.broker_source && (
                                <>
                                  <span>•</span>
                                  <span>{listing.broker_source}</span>
                                </>
                              )}
                              <Badge variant={listing.status === 'Active' ? 'default' : 'secondary'} className="text-[10px] h-4">
                                {listing.status}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive shrink-0"
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
