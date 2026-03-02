import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDeals } from '@/hooks/useDeals';
import { useLinkDeal } from '@/hooks/useLinkedDeal';
import { toast } from 'sonner';
import { Search } from 'lucide-react';

interface LinkDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
}

export function LinkDealDialog({ open, onOpenChange, listingId }: LinkDealDialogProps) {
  const { data: allDeals = [], isLoading } = useDeals();
  const linkDeal = useLinkDeal();
  const [search, setSearch] = useState('');
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allDeals.filter(
      (d) =>
        d.status !== 'Closed' &&
        (d.address.toLowerCase().includes(q) ||
          (d.deal_number?.toLowerCase().includes(q) ?? false) ||
          (d.buyer_name?.toLowerCase().includes(q) ?? false) ||
          (d.seller_name?.toLowerCase().includes(q) ?? false))
    );
  }, [allDeals, search]);

  const handleConfirm = async () => {
    if (!selectedDealId) return;
    try {
      await linkDeal.mutateAsync({ dealId: selectedDealId, listingId });
      toast.success('Deal linked successfully');
      onOpenChange(false);
      setSelectedDealId(null);
      setSearch('');
    } catch {
      toast.error('Failed to link deal');
    }
  };

  const handleClose = () => {
    setSelectedDealId(null);
    setSearch('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight">Link Existing Deal</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pr-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by address, deal #, or party name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 border-2 border-foreground"
            />
          </div>

          <div className="max-h-72 overflow-y-auto rounded-md border-2 border-foreground mr-1">
            {isLoading && (
              <p className="text-sm text-muted-foreground text-center py-4">Loading deals…</p>
            )}
            {!isLoading && filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No open deals found</p>
            )}
            {filtered.map((deal) => (
              <button
                key={deal.id}
                type="button"
                onClick={() => setSelectedDealId(deal.id)}
                className={`w-full text-left px-3 py-2.5 text-sm transition-colors border-b border-border last:border-b-0 ${
                  selectedDealId === deal.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate">{deal.address}</p>
                    <p className="text-xs opacity-70 truncate">
                      {deal.deal_type}
                      {deal.buyer_name ? ` · ${deal.buyer_name}` : ''}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-xs font-black uppercase border-2 whitespace-nowrap ${
                      selectedDealId === deal.id ? 'border-primary-foreground text-primary-foreground' : 'border-foreground'
                    }`}
                  >
                    {deal.status}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </div>

        <DialogFooter className="pr-1">
          <Button variant="outline" onClick={handleClose} className="font-black uppercase border-2 border-foreground">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedDealId || linkDeal.isPending}
            className="font-black uppercase"
          >
            {linkDeal.isPending ? 'Linking…' : 'Link Deal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
