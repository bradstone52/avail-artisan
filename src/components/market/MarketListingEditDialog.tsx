import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MarketListing } from '@/hooks/useMarketListings';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Under Contract', label: 'Under Contract' },
  { value: 'Sold/Leased', label: 'Sold/Leased' },
  { value: 'Leased', label: 'Leased' },
  { value: 'Sold', label: 'Sold' },
  { value: 'OnHold', label: 'On Hold' },
  { value: 'Removed', label: 'Removed' },
  { value: 'Unknown/Removed', label: 'Unknown/Removed' },
];

interface MarketListingEditDialogProps {
  listing: MarketListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function MarketListingEditDialog({
  listing,
  open,
  onOpenChange,
  onSaved,
}: MarketListingEditDialogProps) {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [showTransactionPrompt, setShowTransactionPrompt] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  // Form state
  const [status, setStatus] = useState('Active');
  const [listingType, setListingType] = useState('');
  const [askingRate, setAskingRate] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [availabilityDate, setAvailabilityDate] = useState('');
  const [landlord, setLandlord] = useState('');
  const [notesPublic, setNotesPublic] = useState('');
  const [internalNote, setInternalNote] = useState('');

  // Reset form when listing changes
  useEffect(() => {
    if (listing) {
      setStatus(listing.status || 'Active');
      setListingType(listing.listing_type || '');
      setAskingRate(listing.asking_rate_psf || '');
      setSalePrice(listing.sale_price || '');
      setAvailabilityDate(listing.availability_date || '');
      setLandlord(listing.landlord || '');
      setNotesPublic(listing.notes_public || '');
      setInternalNote(listing.internal_note || '');
    }
  }, [listing]);

  const handleStatusChange = (newStatus: string) => {
    // Check if changing to a "closed" status
    const closedStatuses = ['Sold/Leased', 'Sold', 'Leased'];
    if (closedStatuses.includes(newStatus) && !closedStatuses.includes(status)) {
      setPendingStatus(newStatus);
      setShowTransactionPrompt(true);
    } else {
      setStatus(newStatus);
    }
  };

  const handleConfirmTransaction = () => {
    if (pendingStatus) {
      setStatus(pendingStatus);
    }
    setShowTransactionPrompt(false);
    setPendingStatus(null);
    // Navigate to transaction form after save
  };

  const handleSkipTransaction = () => {
    if (pendingStatus) {
      setStatus(pendingStatus);
    }
    setShowTransactionPrompt(false);
    setPendingStatus(null);
  };

  const handleSave = async () => {
    if (!listing) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('market_listings')
        .update({
          status,
          listing_type: listingType || null,
          asking_rate_psf: askingRate || null,
          sale_price: salePrice || null,
          availability_date: availabilityDate || null,
          landlord: landlord || null,
          notes_public: notesPublic || null,
          internal_note: internalNote || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', listing.id);

      if (error) throw error;

      toast.success('Listing updated');
      onSaved();
      onOpenChange(false);

      // If status was changed to a closed status, offer to create transaction
      const closedStatuses = ['Sold/Leased', 'Sold', 'Leased'];
      if (closedStatuses.includes(status) && pendingStatus === null) {
        // We already handled this via the prompt
      }
    } catch (err) {
      console.error('Error updating listing:', err);
      toast.error('Failed to update listing');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndCreateTransaction = async () => {
    if (!listing) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('market_listings')
        .update({
          status,
          listing_type: listingType || null,
          asking_rate_psf: askingRate || null,
          sale_price: salePrice || null,
          availability_date: availabilityDate || null,
          landlord: landlord || null,
          notes_public: notesPublic || null,
          internal_note: internalNote || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', listing.id);

      if (error) throw error;

      toast.success('Listing updated');
      onSaved();
      onOpenChange(false);
      
      // Navigate to transaction form with listing pre-filled
      navigate(`/transactions/new?listing=${listing.id}`);
    } catch (err) {
      console.error('Error updating listing:', err);
      toast.error('Failed to update listing');
    } finally {
      setIsSaving(false);
    }
  };

  if (!listing) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Listing</DialogTitle>
            <DialogDescription>
              {listing.display_address || listing.address} • {listing.listing_id}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Status */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <div className="col-span-3">
                <Select value={status} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Listing Type */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="listingType" className="text-right">
                Listing Type
              </Label>
              <div className="col-span-3">
                <Select value={listingType} onValueChange={setListingType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lease">Lease</SelectItem>
                    <SelectItem value="Sale">Sale</SelectItem>
                    <SelectItem value="Sublease">Sublease</SelectItem>
                    <SelectItem value="Sale/Lease">Sale/Lease</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Asking Rate */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="askingRate" className="text-right">
                Asking Rate (PSF)
              </Label>
              <Input
                id="askingRate"
                value={askingRate}
                onChange={(e) => setAskingRate(e.target.value)}
                className="col-span-3"
                placeholder="e.g., $12.50"
              />
            </div>

            {/* Sale Price */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="salePrice" className="text-right">
                Sale Price
              </Label>
              <Input
                id="salePrice"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="col-span-3"
                placeholder="e.g., $5,000,000"
              />
            </div>

            {/* Availability */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="availability" className="text-right">
                Availability
              </Label>
              <Input
                id="availability"
                value={availabilityDate}
                onChange={(e) => setAvailabilityDate(e.target.value)}
                className="col-span-3"
                placeholder="e.g., Immediate, Q2 2026"
              />
            </div>

            {/* Landlord */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="landlord" className="text-right">
                Landlord
              </Label>
              <Input
                id="landlord"
                value={landlord}
                onChange={(e) => setLandlord(e.target.value)}
                className="col-span-3"
              />
            </div>

            {/* Public Notes */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="notesPublic" className="text-right pt-2">
                Public Notes
              </Label>
              <Textarea
                id="notesPublic"
                value={notesPublic}
                onChange={(e) => setNotesPublic(e.target.value)}
                className="col-span-3"
                rows={2}
              />
            </div>

            {/* Internal Notes */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="internalNote" className="text-right pt-2">
                Internal Notes
              </Label>
              <Textarea
                id="internalNote"
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                className="col-span-3"
                rows={2}
                placeholder="Private notes (not shown externally)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Prompt */}
      <AlertDialog open={showTransactionPrompt} onOpenChange={setShowTransactionPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create Transaction Record?</AlertDialogTitle>
            <AlertDialogDescription>
              You're marking this listing as "{pendingStatus}". Would you like to create a transaction 
              record to capture the deal details (price, buyer/tenant, closing date, etc.)?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSkipTransaction}>
              Skip for Now
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmTransaction}>
              Yes, Create Transaction
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
