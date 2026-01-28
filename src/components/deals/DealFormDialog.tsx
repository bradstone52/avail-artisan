import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormattedNumberInput } from '@/components/common/FormattedNumberInput';
import { ListingCombobox } from '@/components/deals/ListingCombobox';
import { useCreateDeal, useUpdateDeal } from '@/hooks/useDeals';
import { MarketListing } from '@/hooks/useMarketListings';
import type { Deal, DealFormData, DealType, DealStatus } from '@/types/database';

interface DealFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: Deal | null;
}

const dealTypes: DealType[] = ['Lease', 'Sale', 'Sublease', 'Renewal', 'Expansion'];
const dealStatuses: DealStatus[] = ['Active', 'Under Contract', 'Closed', 'Lost', 'On Hold'];

export function DealFormDialog({ open, onOpenChange, deal }: DealFormDialogProps) {
  const createDeal = useCreateDeal();
  const updateDeal = useUpdateDeal();
  const isEditing = !!deal;

  const [formData, setFormData] = useState<DealFormData>({
    deal_number: '',
    deal_type: 'Lease',
    address: '',
    city: '',
    submarket: '',
    deal_value: undefined,
    commission_percent: 3,
    close_date: '',
    status: 'Active',
    listing_id: undefined,
    notes: '',
  });

  const [selectedListing, setSelectedListing] = useState<MarketListing | null>(null);

  // Calculate commission amount
  const calculatedCommission = formData.deal_value && formData.commission_percent
    ? (formData.deal_value * formData.commission_percent) / 100
    : 0;

  useEffect(() => {
    if (deal) {
      setFormData({
        deal_number: deal.deal_number || '',
        deal_type: deal.deal_type as DealType,
        address: deal.address,
        city: deal.city,
        submarket: deal.submarket,
        deal_value: deal.deal_value ?? undefined,
        commission_percent: deal.commission_percent ?? 3,
        close_date: deal.close_date || '',
        status: deal.status as DealStatus,
        listing_id: deal.listing_id ?? undefined,
        notes: deal.notes || '',
      });
      // Note: We don't have the full listing object when editing, so selectedListing stays null
      // The address fields will show the saved values but be editable if no listing_id
      setSelectedListing(null);
    } else {
      setFormData({
        deal_number: '',
        deal_type: 'Lease',
        address: '',
        city: '',
        submarket: '',
        deal_value: undefined,
        commission_percent: 3,
        close_date: '',
        status: 'Active',
        listing_id: undefined,
        notes: '',
      });
      setSelectedListing(null);
    }
  }, [deal, open]);

  const handleListingChange = (listing: MarketListing | null) => {
    setSelectedListing(listing);
    if (listing) {
      setFormData(prev => ({
        ...prev,
        listing_id: listing.id,
        address: listing.address,
        city: listing.city,
        submarket: listing.submarket,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        listing_id: undefined,
        address: '',
        city: '',
        submarket: '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing && deal) {
        await updateDeal.mutateAsync({ id: deal.id, ...formData });
      } else {
        await createDeal.mutateAsync(formData);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isSubmitting = createDeal.isPending || updateDeal.isPending;
  const hasLinkedListing = !!selectedListing || (isEditing && !!deal?.listing_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Deal' : 'New Deal'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update deal details below.' : 'Create a new deal by filling out the form below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Listing Selector */}
          <div className="space-y-2">
            <Label>Listing</Label>
            <ListingCombobox
              value={formData.listing_id || null}
              onChange={handleListingChange}
            />
            <p className="text-xs text-muted-foreground">
              Select a listing to auto-fill address details
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deal_number">Deal Number</Label>
              <Input
                id="deal_number"
                value={formData.deal_number}
                onChange={(e) => setFormData({ ...formData, deal_number: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deal_type">Deal Type</Label>
              <Select
                value={formData.deal_type}
                onValueChange={(value) => setFormData({ ...formData, deal_type: value as DealType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dealTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
              disabled={hasLinkedListing}
              className={hasLinkedListing ? 'bg-muted' : ''}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                disabled={hasLinkedListing}
                className={hasLinkedListing ? 'bg-muted' : ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="submarket">Submarket</Label>
              <Input
                id="submarket"
                value={formData.submarket}
                onChange={(e) => setFormData({ ...formData, submarket: e.target.value })}
                disabled={hasLinkedListing}
                className={hasLinkedListing ? 'bg-muted' : ''}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as DealStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dealStatuses.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="close_date">Close Date</Label>
              <Input
                id="close_date"
                type="date"
                value={formData.close_date}
                onChange={(e) => setFormData({ ...formData, close_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Deal Value</Label>
              <FormattedNumberInput
                value={formData.deal_value}
                onChange={(value) => setFormData({ ...formData, deal_value: value ?? undefined })}
                prefix="$"
              />
            </div>
            <div className="space-y-2">
              <Label>Commission %</Label>
              <FormattedNumberInput
                value={formData.commission_percent}
                onChange={(value) => setFormData({ ...formData, commission_percent: value ?? undefined })}
                suffix="%"
                max={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Commission Amount</Label>
              <Input
                value={calculatedCommission > 0 ? `$${calculatedCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Deal' : 'Create Deal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
