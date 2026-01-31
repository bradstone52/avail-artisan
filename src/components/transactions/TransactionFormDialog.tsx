import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useTransactions, TransactionInput } from '@/hooks/useTransactions';
import { checkDuplicateAddress, MatchedProperty } from '@/hooks/useDuplicateAddressCheck';
import { DuplicateAddressWarning } from './DuplicateAddressWarning';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const FORM_STORAGE_KEY = 'transaction-form-draft';

const TRANSACTION_TYPE_OPTIONS = [
  { value: 'Lease', label: 'Lease' },
  { value: 'Sale', label: 'Sale' },
  { value: 'Sublease', label: 'Sublease' },
  { value: 'Renewal', label: 'Renewal' },
  { value: 'Unknown/Removed', label: 'Unknown/Removed' },
];

const CITY_OPTIONS = [
  { value: 'Calgary', label: 'Calgary' },
  { value: 'Rocky View County', label: 'Rocky View County' },
  { value: 'Foothills County', label: 'Foothills County' },
  { value: 'Wheatland County', label: 'Wheatland County' },
];

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (transactionId: string) => void;
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  onSaved,
}: TransactionFormDialogProps) {
  const { createTransaction } = useTransactions();
  const [isSaving, setIsSaving] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [matchedProperty, setMatchedProperty] = useState<MatchedProperty | null>(null);

  // Form state
  const [address, setAddress] = useState('');
  const [displayAddress, setDisplayAddress] = useState('');
  const [displayAddressManuallyEdited, setDisplayAddressManuallyEdited] = useState(false);
  const [city, setCity] = useState('Calgary');
  const [submarket, setSubmarket] = useState('');
  const [sizeSf, setSizeSf] = useState('');
  const [transactionType, setTransactionType] = useState<'Sale' | 'Lease' | 'Sublease' | 'Renewal' | 'Unknown/Removed'>('Lease');
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
  const [notes, setNotes] = useState('');

  const hasInitializedRef = useRef(false);

  // Collect form state for persistence
  const getFormState = useCallback(() => ({
    address,
    displayAddress,
    displayAddressManuallyEdited,
    city,
    submarket,
    sizeSf,
    transactionType,
    transactionDate,
    closingDate,
    salePrice,
    leaseRatePsf,
    leaseTermMonths,
    buyerTenantName,
    buyerTenantCompany,
    sellerLandlordName,
    sellerLandlordCompany,
    listingBrokerName,
    listingBrokerCompany,
    sellingBrokerName,
    sellingBrokerCompany,
    notes,
  }), [
    address, displayAddress, displayAddressManuallyEdited, city, submarket, sizeSf,
    transactionType, transactionDate, closingDate, salePrice, leaseRatePsf,
    leaseTermMonths, buyerTenantName, buyerTenantCompany, sellerLandlordName,
    sellerLandlordCompany, listingBrokerName, listingBrokerCompany, sellingBrokerName,
    sellingBrokerCompany, notes,
  ]);

  // Apply form state from storage
  const applyFormState = useCallback((state: ReturnType<typeof getFormState>) => {
    setAddress(state.address);
    setDisplayAddress(state.displayAddress);
    setDisplayAddressManuallyEdited(state.displayAddressManuallyEdited);
    setCity(state.city);
    setSubmarket(state.submarket);
    setSizeSf(state.sizeSf);
    setTransactionType(state.transactionType);
    setTransactionDate(state.transactionDate);
    setClosingDate(state.closingDate);
    setSalePrice(state.salePrice);
    setLeaseRatePsf(state.leaseRatePsf);
    setLeaseTermMonths(state.leaseTermMonths);
    setBuyerTenantName(state.buyerTenantName);
    setBuyerTenantCompany(state.buyerTenantCompany);
    setSellerLandlordName(state.sellerLandlordName);
    setSellerLandlordCompany(state.sellerLandlordCompany);
    setListingBrokerName(state.listingBrokerName);
    setListingBrokerCompany(state.listingBrokerCompany);
    setSellingBrokerName(state.sellingBrokerName);
    setSellingBrokerCompany(state.sellingBrokerCompany);
    setNotes(state.notes);
  }, []);

  // Clear stored draft
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(FORM_STORAGE_KEY);
    } catch (e) {
      // Ignore storage errors
    }
  }, []);

  // Reset form to defaults
  const resetForm = useCallback(() => {
    setAddress('');
    setDisplayAddress('');
    setDisplayAddressManuallyEdited(false);
    setCity('Calgary');
    setSubmarket('');
    setSizeSf('');
    setTransactionType('Lease');
    setTransactionDate('');
    setClosingDate('');
    setSalePrice('');
    setLeaseRatePsf('');
    setLeaseTermMonths('');
    setBuyerTenantName('');
    setBuyerTenantCompany('');
    setSellerLandlordName('');
    setSellerLandlordCompany('');
    setListingBrokerName('');
    setListingBrokerCompany('');
    setSellingBrokerName('');
    setSellingBrokerCompany('');
    setNotes('');
  }, []);

  // Handle address change - mirror to displayAddress if not manually edited
  const handleAddressChange = (value: string) => {
    setAddress(value);
    if (!displayAddressManuallyEdited) {
      setDisplayAddress(value);
    }
  };

  // Handle displayAddress change
  const handleDisplayAddressChange = (value: string) => {
    setDisplayAddress(value);
    if (value === '') {
      // User cleared the field - reset to mirroring mode
      setDisplayAddressManuallyEdited(false);
      setDisplayAddress(address);
    } else if (value !== address) {
      // User made a different value - mark as manually edited
      setDisplayAddressManuallyEdited(true);
    }
  };

  // Save form state to localStorage when it changes
  useEffect(() => {
    if (!open || !hasInitializedRef.current) return;

    try {
      const draft = {
        timestamp: Date.now(),
        state: getFormState(),
      };
      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {
      // Ignore storage errors
    }
  }, [open, getFormState]);

  // Initialize form when dialog opens
  useEffect(() => {
    if (!open) {
      hasInitializedRef.current = false;
      return;
    }

    if (hasInitializedRef.current) return;

    // Try to restore from localStorage
    try {
      const stored = localStorage.getItem(FORM_STORAGE_KEY);
      if (stored) {
        const draft = JSON.parse(stored);
        const isRecent = Date.now() - draft.timestamp < 30 * 60 * 1000;
        
        if (isRecent) {
          applyFormState(draft.state);
          hasInitializedRef.current = true;
          return;
        } else {
          localStorage.removeItem(FORM_STORAGE_KEY);
        }
      }
    } catch (e) {
      // Ignore parse errors
    }

    resetForm();
    hasInitializedRef.current = true;
  }, [open, applyFormState, resetForm]);

  const handleClose = useCallback(() => {
    clearDraft();
    onOpenChange(false);
  }, [clearDraft, onOpenChange]);

  const saveTransaction = async () => {
    setIsSaving(true);
    try {
      const formData: TransactionInput = {
        address: address.trim(),
        display_address: displayAddress.trim() || address.trim(),
        city: city || undefined,
        submarket: submarket || undefined,
        size_sf: sizeSf ? parseInt(sizeSf.replace(/,/g, '')) : undefined,
        transaction_type: transactionType,
        transaction_date: transactionDate || undefined,
        closing_date: closingDate || undefined,
        sale_price: salePrice ? parseFloat(salePrice.replace(/,/g, '')) : undefined,
        lease_rate_psf: leaseRatePsf ? parseFloat(leaseRatePsf) : undefined,
        lease_term_months: leaseTermMonths ? parseInt(leaseTermMonths) : undefined,
        buyer_tenant_name: buyerTenantName || undefined,
        buyer_tenant_company: buyerTenantCompany || undefined,
        seller_landlord_name: sellerLandlordName || undefined,
        seller_landlord_company: sellerLandlordCompany || undefined,
        listing_broker_name: listingBrokerName || undefined,
        listing_broker_company: listingBrokerCompany || undefined,
        selling_broker_name: sellingBrokerName || undefined,
        selling_broker_company: sellingBrokerCompany || undefined,
        notes: notes || undefined,
      };

      const created = await createTransaction(formData);
      if (created) {
        clearDraft();
        onSaved(created.id);
        onOpenChange(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!address.trim()) {
      toast.error('Address is required');
      return;
    }

    // Check for duplicate addresses
    setIsSaving(true);
    const match = await checkDuplicateAddress(address);
    setIsSaving(false);

    if (match) {
      setMatchedProperty(match);
      setShowDuplicateWarning(true);
      return;
    }

    await saveTransaction();
  };

  const handleUseExisting = () => {
    if (!matchedProperty) return;
    
    setAddress(matchedProperty.address);
    setDisplayAddress(matchedProperty.address);
    setCity(matchedProperty.city || city);
    setSubmarket(matchedProperty.submarket || submarket);
    setSizeSf(matchedProperty.size_sf?.toString() || sizeSf);
    setSellerLandlordCompany(matchedProperty.landlord || sellerLandlordCompany);
    
    setShowDuplicateWarning(false);
    setMatchedProperty(null);
  };

  const handleCreateAnyway = () => {
    setShowDuplicateWarning(false);
    setMatchedProperty(null);
    saveTransaction();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
        <DialogContent 
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          preventOutsideClose
          onCloseClick={handleClose}
        >
          <DialogHeader>
            <DialogTitle>New Transaction</DialogTitle>
            <DialogDescription>
              Enter the details for the new transaction.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Property Information Section */}
            <div className="text-sm font-semibold text-muted-foreground border-b pb-2">
              Property Information
            </div>

            {/* Address */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">
                Address *
              </Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => handleAddressChange(e.target.value)}
                className={`col-span-3 placeholder-light ${address ? 'input-filled' : ''}`}
                placeholder="e.g., 123 Industrial Way NE"
              />
            </div>

            {/* Display Address */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="displayAddress" className="text-right">
                Display Address
              </Label>
              <Input
                id="displayAddress"
                value={displayAddress}
                onChange={(e) => handleDisplayAddressChange(e.target.value)}
                className={`col-span-3 placeholder-light ${displayAddress ? 'input-filled' : ''}`}
                placeholder="e.g., 123 Industrial Way NE — Unit A"
              />
            </div>

            {/* City & Submarket */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">City</Label>
              <div className="col-span-1">
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className={city ? 'input-filled' : ''}>
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {CITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Label className="text-right">Submarket</Label>
              <Input
                value={submarket}
                onChange={(e) => setSubmarket(e.target.value)}
                className={`col-span-1 placeholder-light ${submarket ? 'input-filled' : ''}`}
                placeholder="e.g., SE Industrial"
              />
            </div>

            {/* Size */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sizeSf" className="text-right">
                Size (SF)
              </Label>
              <Input
                id="sizeSf"
                type="number"
                value={sizeSf}
                onChange={(e) => setSizeSf(e.target.value)}
                className={`col-span-3 placeholder-light ${sizeSf ? 'input-filled' : ''}`}
                placeholder="e.g., 50000"
              />
            </div>

            {/* Transaction Details Section */}
            <div className="text-sm font-semibold text-muted-foreground border-b pb-2 mt-4">
              Transaction Details
            </div>

            {/* Transaction Type */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Type *</Label>
              <div className="col-span-3">
                <Select 
                  value={transactionType} 
                  onValueChange={(v) => setTransactionType(v as typeof transactionType)}
                >
                  <SelectTrigger className={transactionType ? 'input-filled' : ''}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSACTION_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sale Price or Lease Rate */}
            {transactionType === 'Sale' ? (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Sale Price ($)</Label>
                <Input
                  type="number"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className={`col-span-3 placeholder-light ${salePrice ? 'input-filled' : ''}`}
                  placeholder="e.g., 5000000"
                />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Lease Rate ($/SF)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={leaseRatePsf}
                    onChange={(e) => setLeaseRatePsf(e.target.value)}
                    className={`col-span-1 placeholder-light ${leaseRatePsf ? 'input-filled' : ''}`}
                    placeholder="e.g., 12.50"
                  />
                  <Label className="text-right">Term (months)</Label>
                  <Input
                    type="number"
                    value={leaseTermMonths}
                    onChange={(e) => setLeaseTermMonths(e.target.value)}
                    className={`col-span-1 placeholder-light ${leaseTermMonths ? 'input-filled' : ''}`}
                    placeholder="e.g., 60"
                  />
                </div>
              </>
            )}

            {/* Dates */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Transaction Date</Label>
              <Input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className={`col-span-1 ${transactionDate ? 'input-filled' : ''}`}
              />
              <Label className="text-right">Closing Date</Label>
              <Input
                type="date"
                value={closingDate}
                onChange={(e) => setClosingDate(e.target.value)}
                className={`col-span-1 ${closingDate ? 'input-filled' : ''}`}
              />
            </div>

            {/* Parties Section */}
            <div className="text-sm font-semibold text-muted-foreground border-b pb-2 mt-4">
              {transactionType === 'Sale' ? 'Buyer' : 'Tenant'}
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Contact Name</Label>
              <Input
                value={buyerTenantName}
                onChange={(e) => setBuyerTenantName(e.target.value)}
                className={`col-span-1 placeholder-light ${buyerTenantName ? 'input-filled' : ''}`}
                placeholder="Name"
              />
              <Label className="text-right">Company</Label>
              <Input
                value={buyerTenantCompany}
                onChange={(e) => setBuyerTenantCompany(e.target.value)}
                className={`col-span-1 placeholder-light ${buyerTenantCompany ? 'input-filled' : ''}`}
                placeholder="Company"
              />
            </div>

            <div className="text-sm font-semibold text-muted-foreground border-b pb-2 mt-4">
              {transactionType === 'Sale' ? 'Seller' : 'Landlord'}
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Contact Name</Label>
              <Input
                value={sellerLandlordName}
                onChange={(e) => setSellerLandlordName(e.target.value)}
                className={`col-span-1 placeholder-light ${sellerLandlordName ? 'input-filled' : ''}`}
                placeholder="Name"
              />
              <Label className="text-right">Company</Label>
              <Input
                value={sellerLandlordCompany}
                onChange={(e) => setSellerLandlordCompany(e.target.value)}
                className={`col-span-1 placeholder-light ${sellerLandlordCompany ? 'input-filled' : ''}`}
                placeholder="Company"
              />
            </div>

            {/* Brokers Section */}
            <div className="text-sm font-semibold text-muted-foreground border-b pb-2 mt-4">
              Listing Broker
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Broker Name</Label>
              <Input
                value={listingBrokerName}
                onChange={(e) => setListingBrokerName(e.target.value)}
                className={`col-span-1 placeholder-light ${listingBrokerName ? 'input-filled' : ''}`}
                placeholder="Name"
              />
              <Label className="text-right">Brokerage</Label>
              <Input
                value={listingBrokerCompany}
                onChange={(e) => setListingBrokerCompany(e.target.value)}
                className={`col-span-1 placeholder-light ${listingBrokerCompany ? 'input-filled' : ''}`}
                placeholder="Brokerage"
              />
            </div>

            <div className="text-sm font-semibold text-muted-foreground border-b pb-2 mt-4">
              {transactionType === 'Sale' ? 'Selling Broker' : 'Tenant Broker'}
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Broker Name</Label>
              <Input
                value={sellingBrokerName}
                onChange={(e) => setSellingBrokerName(e.target.value)}
                className={`col-span-1 placeholder-light ${sellingBrokerName ? 'input-filled' : ''}`}
                placeholder="Name"
              />
              <Label className="text-right">Brokerage</Label>
              <Input
                value={sellingBrokerCompany}
                onChange={(e) => setSellingBrokerCompany(e.target.value)}
                className={`col-span-1 placeholder-light ${sellingBrokerCompany ? 'input-filled' : ''}`}
                placeholder="Brokerage"
              />
            </div>

            {/* Notes Section */}
            <div className="text-sm font-semibold text-muted-foreground border-b pb-2 mt-4">
              Notes
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`col-span-3 placeholder-light ${notes ? 'input-filled' : ''}`}
                placeholder="Additional transaction notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DuplicateAddressWarning
        open={showDuplicateWarning}
        onOpenChange={setShowDuplicateWarning}
        matchedProperty={matchedProperty}
        onUseExisting={handleUseExisting}
        onCreateAnyway={handleCreateAnyway}
      />
    </>
  );
}
