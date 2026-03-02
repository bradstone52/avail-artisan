import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LinkDealDialog } from './LinkDealDialog';
import { useLinkedDeal, useLinkDeal } from '@/hooks/useLinkedDeal';
import { formatCurrency } from '@/lib/format';
import { Handshake, ExternalLink, Unlink, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const dealStatusColors: Record<string, string> = {
  Active: 'bg-green-100 text-green-800 border-green-300',
  Conditional: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Firm: 'bg-blue-100 text-blue-800 border-blue-300',
  Closed: 'bg-purple-100 text-purple-800 border-purple-300',
  Lost: 'bg-red-100 text-red-800 border-red-300',
  'On Hold': 'bg-gray-100 text-gray-600 border-gray-300',
};

interface LinkedDealPanelProps {
  listingId: string;
}

export function LinkedDealPanel({ listingId }: LinkedDealPanelProps) {
  const navigate = useNavigate();
  const { data: deal, isLoading } = useLinkedDeal(listingId);
  const linkDeal = useLinkDeal();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false);

  const handleUnlink = async () => {
    if (!deal) return;
    try {
      await linkDeal.mutateAsync({ dealId: deal.id, listingId: null });
      toast.success('Deal unlinked');
    } catch {
      toast.error('Failed to unlink deal');
    }
    setUnlinkConfirmOpen(false);
  };

  return (
    <>
      <Card className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Handshake className="h-4 w-4" />
            Linked Deal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : deal ? (
            <>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs border ${dealStatusColors[deal.status] || ''}`}
                  >
                    {deal.status}
                  </Badge>
                  <span className="text-muted-foreground text-xs">{deal.deal_type}</span>
                </div>

                {deal.deal_number && (
                  <p className="text-xs text-muted-foreground">#{deal.deal_number}</p>
                )}

                <p className="font-medium truncate">{deal.address}</p>

                {(deal.deal_value || deal.lease_rate_psf) && (
                  <p className="text-muted-foreground">
                    {deal.deal_type === 'Sale' && deal.deal_value
                      ? formatCurrency(deal.deal_value)
                      : deal.lease_rate_psf
                      ? `$${deal.lease_rate_psf}/SF`
                      : null}
                  </p>
                )}

                {deal.close_date && (
                  <p className="text-xs text-muted-foreground">
                    Close: {new Date(deal.close_date).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs"
                  onClick={() => navigate(`/deals/${deal.id}`)}
                >
                  <ExternalLink className="h-3 w-3" />
                  Open Deal
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1.5 text-destructive hover:text-destructive"
                  onClick={() => setUnlinkConfirmOpen(true)}
                  disabled={linkDeal.isPending}
                >
                  <Unlink className="h-3 w-3" />
                  Unlink
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">No deal linked to this listing.</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => setLinkDialogOpen(true)}
              >
                <Link2 className="h-4 w-4" />
                Link Existing Deal
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <LinkDealDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        listingId={listingId}
      />

      <AlertDialog open={unlinkConfirmOpen} onOpenChange={setUnlinkConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink deal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the link between this listing and the deal. The deal itself will not
              be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlink}>Unlink</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
