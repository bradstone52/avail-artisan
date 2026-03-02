import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCreateDeal } from '@/hooks/useDeals';
import { toast } from 'sonner';
import type { InternalListing } from '@/hooks/useInternalListings';
import type { DealFormData, DealType } from '@/types/database';

interface ConvertToDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: InternalListing;
}

export function ConvertToDealDialog({ open, onOpenChange, listing }: ConvertToDealDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createDeal = useCreateDeal();

  // For "Both" listings the user must choose; otherwise pre-select from the listing type.
  const requiresChoice = listing.deal_type === 'Both';
  const [chosenType, setChosenType] = useState<'Lease' | 'Sale'>(
    listing.deal_type === 'Sale' ? 'Sale' : 'Lease'
  );

  const resolvedDealType: DealType = requiresChoice
    ? chosenType
    : listing.deal_type === 'Sale'
    ? 'Sale'
    : 'Lease';

  const isSubmitDisabled =
    createDeal.isPending || (requiresChoice && !chosenType);

  const handleSubmit = async () => {
    const address = listing.display_address || listing.address;

    const dealData = {
      deal_type: resolvedDealType,
      address,
      city: listing.city,
      submarket: listing.submarket,
      size_sf: listing.size_sf ?? undefined,
      status: 'Conditional' as DealFormData['status'],
      // Financial hints
      lease_rate_psf: resolvedDealType !== 'Sale' ? (listing.asking_rent_psf ?? undefined) : undefined,
      deal_value: resolvedDealType === 'Sale' ? (listing.asking_sale_price ?? undefined) : undefined,
      // Agent hint
      cv_agent_id: listing.assigned_agent_id ?? undefined,
      // Link back to internal listing
      internal_listing_id: listing.id,
      // Required but empty defaults
      commission_percent: 3,
      other_brokerage_percent: 1.5,
      clearview_percent: 1.5,
      gst_rate: 5,
    };

    try {
      const newDeal = await createDeal.mutateAsync(dealData);
      // Invalidate linked-deal so the panel refreshes on the listing page
      queryClient.invalidateQueries({ queryKey: ['linked-deal', listing.id] });
      queryClient.invalidateQueries({ queryKey: ['internal-listings'] });
      toast.success('Deal created and linked to listing');
      onOpenChange(false);
      navigate(`/deals/${newDeal.id}`);
    } catch {
      // Error handled inside useCreateDeal
    }
  };

  const handleClose = () => {
    // Reset choice to listing default when closing
    setChosenType(listing.deal_type === 'Sale' ? 'Sale' : 'Lease');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Convert to Deal</DialogTitle>
          <DialogDescription>
            Creates a new deal pre-filled from this listing and links it automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Address preview (read-only) */}
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input
              readOnly
              value={listing.display_address || listing.address}
              className="bg-muted cursor-default"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input readOnly value={listing.city} className="bg-muted cursor-default" />
            </div>
            <div className="space-y-1.5">
              <Label>Submarket</Label>
              <Input readOnly value={listing.submarket} className="bg-muted cursor-default" />
            </div>
          </div>

          {listing.size_sf && (
            <div className="space-y-1.5">
              <Label>Size (SF)</Label>
              <Input
                readOnly
                value={listing.size_sf.toLocaleString()}
                className="bg-muted cursor-default"
              />
            </div>
          )}

          {/* Deal type — required radio for "Both" listings */}
          <div className="space-y-2">
            <Label>
              Deal Type{requiresChoice && <span className="text-destructive ml-1">*</span>}
            </Label>
            {requiresChoice ? (
              <RadioGroup
                value={chosenType}
                onValueChange={(v) => setChosenType(v as 'Lease' | 'Sale')}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="Lease" id="type-lease" />
                  <Label htmlFor="type-lease" className="cursor-pointer">Lease</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="Sale" id="type-sale" />
                  <Label htmlFor="type-sale" className="cursor-pointer">Sale</Label>
                </div>
              </RadioGroup>
            ) : (
              <Input readOnly value={resolvedDealType} className="bg-muted cursor-default" />
            )}
          </div>

          {/* Financial hints (read-only preview) */}
          {resolvedDealType !== 'Sale' && listing.asking_rent_psf && (
            <div className="space-y-1.5">
              <Label>Asking Rent (hint)</Label>
              <Input
                readOnly
                value={`$${listing.asking_rent_psf}/SF`}
                className="bg-muted cursor-default"
              />
            </div>
          )}
          {resolvedDealType === 'Sale' && listing.asking_sale_price && (
            <div className="space-y-1.5">
              <Label>Asking Price (hint)</Label>
              <Input
                readOnly
                value={`$${listing.asking_sale_price.toLocaleString()}`}
                className="bg-muted cursor-default"
              />
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Status will be set to <strong>Conditional</strong>. You can edit all details on the
            deal page after creation.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={createDeal.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitDisabled}>
            {createDeal.isPending ? 'Creating…' : 'Create Deal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
