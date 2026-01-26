import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MarketListing } from '@/hooks/useMarketListings';
import { useTransactions, TransactionInput } from '@/hooks/useTransactions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Receipt, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogTransactionDialogProps {
  listing: MarketListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function LogTransactionDialog({
  listing,
  open,
  onOpenChange,
  onSaved,
}: LogTransactionDialogProps) {
  const navigate = useNavigate();
  const { createTransaction } = useTransactions();
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [transactionType, setTransactionType] = useState<'Sale' | 'Lease' | 'Sublease'>('Lease');
  const [transactionDate, setTransactionDate] = useState('');
  const [closingDate, setClosingDate] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [leaseRatePsf, setLeaseRatePsf] = useState('');
  const [leaseTermMonths, setLeaseTermMonths] = useState('');
  const [buyerTenantName, setBuyerTenantName] = useState('');
  const [buyerTenantCompany, setBuyerTenantCompany] = useState('');
  const [sellerLandlordName, setSellerLandlordName] = useState('');
  const [sellerLandlordCompany, setSellerLandlordCompany] = useState('');
  const [listingBrokerName, setListingBrokerName] = useState('');
  const [listingBrokerCompany, setListingBrokerCompany] = useState('');
  const [sellingBrokerName, setSellingBrokerName] = useState('');
  const [sellingBrokerCompany, setSellingBrokerCompany] = useState('');
  const [commissionPercent, setCommissionPercent] = useState('');
  const [commissionAmount, setCommissionAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Reset form when listing changes
  useEffect(() => {
    if (listing && open) {
      // Pre-fill from listing
      setSellerLandlordCompany(listing.landlord || '');
      setListingBrokerCompany(listing.broker_source || '');
      // Infer transaction type from listing type
      if (listing.listing_type === 'Sale') {
        setTransactionType('Sale');
      } else if (listing.listing_type === 'Sublease') {
        setTransactionType('Sublease');
      } else {
        setTransactionType('Lease');
      }
      // Reset other fields
      setTransactionDate('');
      setClosingDate('');
      setSalePrice('');
      setLeaseRatePsf('');
      setLeaseTermMonths('');
      setBuyerTenantName('');
      setBuyerTenantCompany('');
      setSellerLandlordName('');
      setListingBrokerName('');
      setSellingBrokerName('');
      setSellingBrokerCompany('');
      setCommissionPercent('');
      setCommissionAmount('');
      setNotes('');
    }
  }, [listing, open]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing) return;

    setIsSaving(true);
    try {
      const input: TransactionInput = {
        market_listing_id: listing.id,
        listing_id: listing.listing_id,
        address: listing.address,
        display_address: listing.display_address,
        city: listing.city,
        submarket: listing.submarket,
        size_sf: listing.size_sf,
        transaction_type: transactionType,
        transaction_date: transactionDate || null,
        closing_date: closingDate || null,
        sale_price: salePrice ? parseFloat(salePrice.replace(/,/g, '')) : null,
        lease_rate_psf: leaseRatePsf ? parseFloat(leaseRatePsf.replace(/,/g, '')) : null,
        lease_term_months: leaseTermMonths ? parseInt(leaseTermMonths) : null,
        buyer_tenant_name: buyerTenantName || null,
        buyer_tenant_company: buyerTenantCompany || null,
        seller_landlord_name: sellerLandlordName || null,
        seller_landlord_company: sellerLandlordCompany || null,
        listing_broker_name: listingBrokerName || null,
        listing_broker_company: listingBrokerCompany || null,
        selling_broker_name: sellingBrokerName || null,
        selling_broker_company: sellingBrokerCompany || null,
        commission_percent: commissionPercent ? parseFloat(commissionPercent) : null,
        commission_amount: commissionAmount ? parseFloat(commissionAmount.replace(/,/g, '')) : null,
        notes: notes || null,
      };

      const created = await createTransaction(input);
      if (created) {
        onOpenChange(false);
        onSaved?.();
        // Navigate to transaction detail
        navigate(`/transactions/${created.id}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Helper for input styling
  const inputClass = (value: string) =>
    cn('h-9', value && 'input-filled');

  // Stable hook count - render closed shell if no listing
  if (!listing) {
    return (
      <Dialog open={false}>
        <DialogContent className="hidden" />
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] p-0 gap-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">Log Transaction</DialogTitle>
                <DialogDescription className="text-sm">
                  {listing.display_address || listing.address}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[calc(90vh-180px)]">
            <div className="px-6 py-4 space-y-6">
              {/* Property Info (read-only) */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Property</div>
                <div className="font-medium">{listing.display_address || listing.address}</div>
                <div className="text-sm text-muted-foreground">
                  {listing.submarket} • {listing.size_sf?.toLocaleString()} SF
                </div>
              </div>

              {/* Transaction Type */}
              <div className="space-y-2">
                <Label>Transaction Type *</Label>
                <Select
                  value={transactionType}
                  onValueChange={(v) => setTransactionType(v as 'Sale' | 'Lease' | 'Sublease')}
                >
                  <SelectTrigger className={cn('h-9', transactionType && 'input-filled')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sale">Sale</SelectItem>
                    <SelectItem value="Lease">Lease</SelectItem>
                    <SelectItem value="Sublease">Sublease</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Pricing */}
              {transactionType === 'Sale' ? (
                <div className="space-y-2">
                  <Label htmlFor="sale_price">Sale Price ($)</Label>
                  <Input
                    id="sale_price"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="e.g., 5,000,000"
                    className={cn(inputClass(salePrice), 'placeholder-light')}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lease_rate">Lease Rate ($/SF)</Label>
                    <Input
                      id="lease_rate"
                      value={leaseRatePsf}
                      onChange={(e) => setLeaseRatePsf(e.target.value)}
                      placeholder="e.g., 12.50"
                      className={cn(inputClass(leaseRatePsf), 'placeholder-light')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lease_term">Lease Term (months)</Label>
                    <Input
                      id="lease_term"
                      type="number"
                      value={leaseTermMonths}
                      onChange={(e) => setLeaseTermMonths(e.target.value)}
                      placeholder="e.g., 60"
                      className={cn(inputClass(leaseTermMonths), 'placeholder-light')}
                    />
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transaction_date">Transaction Date</Label>
                  <Input
                    id="transaction_date"
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className={inputClass(transactionDate)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closing_date">Closing Date</Label>
                  <Input
                    id="closing_date"
                    type="date"
                    value={closingDate}
                    onChange={(e) => setClosingDate(e.target.value)}
                    className={inputClass(closingDate)}
                  />
                </div>
              </div>

              {/* Buyer/Tenant */}
              <div className="space-y-3">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  {transactionType === 'Sale' ? 'Buyer' : 'Tenant'}
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="buyer_name">Contact Name</Label>
                    <Input
                      id="buyer_name"
                      value={buyerTenantName}
                      onChange={(e) => setBuyerTenantName(e.target.value)}
                      placeholder="e.g., John Smith"
                      className={cn(inputClass(buyerTenantName), 'placeholder-light')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="buyer_company">Company</Label>
                    <Input
                      id="buyer_company"
                      value={buyerTenantCompany}
                      onChange={(e) => setBuyerTenantCompany(e.target.value)}
                      placeholder="e.g., ABC Logistics"
                      className={cn(inputClass(buyerTenantCompany), 'placeholder-light')}
                    />
                  </div>
                </div>
              </div>

              {/* Seller/Landlord */}
              <div className="space-y-3">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  {transactionType === 'Sale' ? 'Seller' : 'Landlord'}
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="seller_name">Contact Name</Label>
                    <Input
                      id="seller_name"
                      value={sellerLandlordName}
                      onChange={(e) => setSellerLandlordName(e.target.value)}
                      placeholder="e.g., Jane Doe"
                      className={cn(inputClass(sellerLandlordName), 'placeholder-light')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seller_company">Company</Label>
                    <Input
                      id="seller_company"
                      value={sellerLandlordCompany}
                      onChange={(e) => setSellerLandlordCompany(e.target.value)}
                      placeholder="e.g., XYZ Properties"
                      className={cn(inputClass(sellerLandlordCompany), 'placeholder-light')}
                    />
                  </div>
                </div>
              </div>

              {/* Listing Broker */}
              <div className="space-y-3">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  Listing Broker
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="listing_broker_name">Broker Name</Label>
                    <Input
                      id="listing_broker_name"
                      value={listingBrokerName}
                      onChange={(e) => setListingBrokerName(e.target.value)}
                      placeholder="e.g., Mike Johnson"
                      className={cn(inputClass(listingBrokerName), 'placeholder-light')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="listing_broker_company">Brokerage</Label>
                    <Input
                      id="listing_broker_company"
                      value={listingBrokerCompany}
                      onChange={(e) => setListingBrokerCompany(e.target.value)}
                      placeholder="e.g., CBRE"
                      className={cn(inputClass(listingBrokerCompany), 'placeholder-light')}
                    />
                  </div>
                </div>
              </div>

              {/* Selling/Tenant Broker */}
              <div className="space-y-3">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  Selling/Tenant Broker
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="selling_broker_name">Broker Name</Label>
                    <Input
                      id="selling_broker_name"
                      value={sellingBrokerName}
                      onChange={(e) => setSellingBrokerName(e.target.value)}
                      placeholder="e.g., Sarah Lee"
                      className={cn(inputClass(sellingBrokerName), 'placeholder-light')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="selling_broker_company">Brokerage</Label>
                    <Input
                      id="selling_broker_company"
                      value={sellingBrokerCompany}
                      onChange={(e) => setSellingBrokerCompany(e.target.value)}
                      placeholder="e.g., Colliers"
                      className={cn(inputClass(sellingBrokerCompany), 'placeholder-light')}
                    />
                  </div>
                </div>
              </div>

              {/* Commission */}
              <div className="space-y-3">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  Commission
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="commission_percent">Percent (%)</Label>
                    <Input
                      id="commission_percent"
                      value={commissionPercent}
                      onChange={(e) => setCommissionPercent(e.target.value)}
                      placeholder="e.g., 5.0"
                      className={cn(inputClass(commissionPercent), 'placeholder-light')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="commission_amount">Amount ($)</Label>
                    <Input
                      id="commission_amount"
                      value={commissionAmount}
                      onChange={(e) => setCommissionAmount(e.target.value)}
                      placeholder="e.g., 50,000"
                      className={cn(inputClass(commissionAmount), 'placeholder-light')}
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional transaction notes..."
                  rows={3}
                  className={cn(notes && 'input-filled')}
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="px-6 py-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Receipt className="h-4 w-4 mr-2" />
                  Log Transaction
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
