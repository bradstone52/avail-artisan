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
import { useOrg } from '@/hooks/useOrg';
import { useAuth } from '@/contexts/AuthContext';

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Under Contract', label: 'Under Contract' },
  { value: 'Sold/Leased', label: 'Sold/Leased' },
  { value: 'Unknown/Removed', label: 'Unknown/Removed' },
];

const LISTING_TYPE_OPTIONS = [
  { value: 'Lease', label: 'Lease' },
  { value: 'Sale', label: 'Sale' },
  { value: 'Sublease', label: 'Sublease' },
  { value: 'Sale/Lease', label: 'Sale/Lease' },
];

const CITY_OPTIONS = [
  { value: 'Calgary', label: 'Calgary' },
  { value: 'Rocky View County', label: 'Rocky View County' },
  { value: 'Foothills County', label: 'Foothills County' },
  { value: 'Wheatland County', label: 'Wheatland County' },
];

interface MarketListingEditDialogProps {
  listing: MarketListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  mode?: 'edit' | 'create';
}

export function MarketListingEditDialog({
  listing,
  open,
  onOpenChange,
  onSaved,
  mode = 'edit',
}: MarketListingEditDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { org } = useOrg();
  const [isSaving, setIsSaving] = useState(false);
  const [showTransactionPrompt, setShowTransactionPrompt] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const isCreateMode = mode === 'create';

  // Form state - Core fields for create
  const [listingId, setListingId] = useState('');
  const [address, setAddress] = useState('');
  const [displayAddress, setDisplayAddress] = useState('');
  const [city, setCity] = useState('');
  const [submarket, setSubmarket] = useState('');
  const [sizeSf, setSizeSf] = useState('');
  
  // Form state - Additional fields
  const [status, setStatus] = useState('Active');
  const [listingType, setListingType] = useState('');
  const [askingRate, setAskingRate] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [availabilityDate, setAvailabilityDate] = useState('');
  const [landlord, setLandlord] = useState('');
  const [brokerSource, setBrokerSource] = useState('');
  const [link, setLink] = useState('');
  const [notesPublic, setNotesPublic] = useState('');
  const [internalNote, setInternalNote] = useState('');

  // Building specs
  const [clearHeight, setClearHeight] = useState('');
  const [dockDoors, setDockDoors] = useState('');
  const [driveInDoors, setDriveInDoors] = useState('');

  // Generate a unique listing ID
  const generateListingId = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ML-${year}${month}${day}-${random}`;
  };

  // Reset form when listing changes or dialog opens
  useEffect(() => {
    if (isCreateMode) {
      // Auto-generate listing ID for create mode
      setListingId(generateListingId());
      setAddress('');
      setDisplayAddress('');
      setCity('');
      setSubmarket('');
      setSizeSf('');
      setStatus('Active');
      setListingType('');
      setAskingRate('');
      setSalePrice('');
      setAvailabilityDate('');
      setLandlord('');
      setBrokerSource('');
      setLink('');
      setNotesPublic('');
      setInternalNote('');
      setClearHeight('');
      setDockDoors('');
      setDriveInDoors('');
    } else if (listing) {
      setListingId(listing.listing_id || '');
      setAddress(listing.address || '');
      setDisplayAddress(listing.display_address || '');
      setCity(listing.city || '');
      setSubmarket(listing.submarket || '');
      setSizeSf(listing.size_sf?.toString() || '');
      setStatus(listing.status || 'Active');
      setListingType(listing.listing_type || '');
      setAskingRate(listing.asking_rate_psf || '');
      setSalePrice(listing.sale_price || '');
      setAvailabilityDate(listing.availability_date || '');
      setLandlord(listing.landlord || '');
      setBrokerSource(listing.broker_source || '');
      setLink(listing.link || '');
      setNotesPublic(listing.notes_public || '');
      setInternalNote(listing.internal_note || '');
      setClearHeight(listing.clear_height_ft?.toString() || '');
      setDockDoors(listing.dock_doors?.toString() || '');
      setDriveInDoors(listing.drive_in_doors?.toString() || '');
    }
  }, [listing, isCreateMode, open]);

  const handleStatusChange = (newStatus: string) => {
    // Check if changing to "Sold/Leased" status (only in edit mode)
    if (!isCreateMode && newStatus === 'Sold/Leased' && status !== 'Sold/Leased') {
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
  };

  const handleSkipTransaction = () => {
    if (pendingStatus) {
      setStatus(pendingStatus);
    }
    setShowTransactionPrompt(false);
    setPendingStatus(null);
  };

  const handleSave = async () => {
    if (isCreateMode) {
      await handleCreate();
    } else {
      await handleUpdate();
    }
  };

  const handleCreate = async () => {
    if (!user || !org) {
      toast.error('You must be logged in to create a listing');
      return;
    }

    // Validate required fields
    if (!address.trim()) {
      toast.error('Address is required');
      return;
    }
    if (!submarket.trim()) {
      toast.error('Submarket is required');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('market_listings')
        .insert({
          listing_id: listingId.trim(),
          address: address.trim(),
          display_address: displayAddress.trim() || address.trim(),
          city: city.trim() || '',
          submarket: submarket.trim(),
          size_sf: parseInt(sizeSf) || 0,
          status,
          listing_type: listingType || null,
          asking_rate_psf: askingRate || null,
          sale_price: salePrice || null,
          availability_date: availabilityDate || null,
          landlord: landlord || null,
          broker_source: brokerSource || null,
          link: link || null,
          notes_public: notesPublic || null,
          internal_note: internalNote || null,
          clear_height_ft: clearHeight ? parseFloat(clearHeight) : null,
          dock_doors: dockDoors ? parseInt(dockDoors) : 0,
          drive_in_doors: driveInDoors ? parseInt(driveInDoors) : 0,
          user_id: user.id,
          org_id: org.id,
        });

      if (error) throw error;

      toast.success('Listing created successfully');
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error creating listing:', err);
      if (err.code === '23505') {
        toast.error('A listing with this ID already exists');
      } else {
        toast.error('Failed to create listing');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!listing) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('market_listings')
        .update({
          display_address: displayAddress || null,
          status,
          listing_type: listingType || null,
          asking_rate_psf: askingRate || null,
          sale_price: salePrice || null,
          availability_date: availabilityDate || null,
          landlord: landlord || null,
          broker_source: brokerSource || null,
          link: link || null,
          notes_public: notesPublic || null,
          internal_note: internalNote || null,
          clear_height_ft: clearHeight ? parseFloat(clearHeight) : null,
          dock_doors: dockDoors ? parseInt(dockDoors) : null,
          drive_in_doors: driveInDoors ? parseInt(driveInDoors) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', listing.id);

      if (error) throw error;

      toast.success('Listing updated');
      onSaved();
      onOpenChange(false);

      // If status was changed to Sold/Leased, offer to create transaction
      if (status === 'Sold/Leased' && pendingStatus === 'Sold/Leased') {
        navigate(`/transactions/new?listing=${listing.id}`);
      }
    } catch (err) {
      console.error('Error updating listing:', err);
      toast.error('Failed to update listing');
    } finally {
      setIsSaving(false);
    }
  };

  // For edit mode, require listing
  if (!isCreateMode && !listing) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isCreateMode ? 'Add New Listing' : 'Edit Listing'}</DialogTitle>
            <DialogDescription>
              {isCreateMode 
                ? 'Enter the details for the new market listing.'
                : `${listing?.display_address || listing?.address} • ${listing?.listing_id}`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Core Fields - Show in create mode or as read-only in edit */}
            {isCreateMode && (
              <>
                {/* Listing ID - Auto-generated and locked */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="listingId" className="text-right">
                    Listing ID
                  </Label>
                  <Input
                    id="listingId"
                    value={listingId}
                    readOnly
                    disabled
                    className="col-span-3 bg-muted cursor-not-allowed"
                  />
                </div>

                {/* Address */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="address" className="text-right">
                    Address *
                  </Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="col-span-3"
                    placeholder="e.g., 123 Industrial Way"
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
                    onChange={(e) => setDisplayAddress(e.target.value)}
                    className="col-span-3"
                    placeholder="e.g., 123 Industrial Way — Unit 4"
                  />
                </div>

                {/* City */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="city" className="text-right">
                    City
                  </Label>
                  <div className="col-span-3">
                    <Select value={city} onValueChange={setCity}>
                      <SelectTrigger>
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
                </div>

                {/* Submarket */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="submarket" className="text-right">
                    Submarket *
                  </Label>
                  <Input
                    id="submarket"
                    value={submarket}
                    onChange={(e) => setSubmarket(e.target.value)}
                    className="col-span-3"
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
                    className="col-span-3"
                    placeholder="e.g., 150000"
                  />
                </div>
              </>
            )}

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
                    {LISTING_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Broker Source */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="brokerSource" className="text-right">
                Broker
              </Label>
              <Input
                id="brokerSource"
                value={brokerSource}
                onChange={(e) => setBrokerSource(e.target.value)}
                className="col-span-3"
                placeholder="e.g., CBRE"
              />
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

            {/* Brochure Link */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="link" className="text-right">
                Brochure Link
              </Label>
              <Input
                id="link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="col-span-3"
                placeholder="https://..."
              />
            </div>

            {/* Building Specs */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Clear Height (ft)</Label>
              <Input
                type="number"
                value={clearHeight}
                onChange={(e) => setClearHeight(e.target.value)}
                className="col-span-1"
                placeholder="32"
              />
              <Label className="text-right">Dock Doors</Label>
              <Input
                type="number"
                value={dockDoors}
                onChange={(e) => setDockDoors(e.target.value)}
                className="col-span-1"
                placeholder="10"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Drive-In Doors</Label>
              <Input
                type="number"
                value={driveInDoors}
                onChange={(e) => setDriveInDoors(e.target.value)}
                className="col-span-1"
                placeholder="2"
              />
              <div className="col-span-2" />
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
              {isCreateMode ? 'Create Listing' : 'Save Changes'}
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
