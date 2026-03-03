import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MarketListing } from '@/hooks/useMarketListings';

interface BulkEditListingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: Set<string>;
  listings: MarketListing[];
  uniqueSubmarkets: string[];
  uniqueCities: string[];
  onSaved: () => void;
}

const STATUS_OPTIONS = ['Active', 'Under Contract', 'Sold/Leased', 'Unknown/Removed'];
const LISTING_TYPE_OPTIONS = ['Lease', 'Sale', 'Sale or Lease', 'Sublease'];

const UNSET = '__unset__';

export function BulkEditListingsDialog({
  open,
  onOpenChange,
  selectedIds,
  listings,
  uniqueSubmarkets,
  uniqueCities,
  onSaved,
}: BulkEditListingsDialogProps) {
  const [address, setAddress] = useState('');
  const [displayAddress, setDisplayAddress] = useState('');
  const [submarket, setSubmarket] = useState(UNSET);
  const [city, setCity] = useState('');
  const [status, setStatus] = useState(UNSET);
  const [listingType, setListingType] = useState(UNSET);
  const [landlord, setLandlord] = useState('');
  const [brokerSource, setBrokerSource] = useState('');
  const [isDistWarehouse, setIsDistWarehouse] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setAddress('');
    setDisplayAddress('');
    setSubmarket(UNSET);
    setCity('');
    setStatus(UNSET);
    setListingType(UNSET);
    setLandlord('');
    setBrokerSource('');
    setIsDistWarehouse(null);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleSave = async () => {
    const baseUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (submarket !== UNSET) baseUpdates.submarket = submarket;
    if (city.trim()) baseUpdates.city = city.trim();
    if (status !== UNSET) baseUpdates.status = status;
    if (listingType !== UNSET) baseUpdates.listing_type = listingType;
    if (landlord.trim()) baseUpdates.landlord = landlord.trim();
    if (brokerSource.trim()) baseUpdates.broker_source = brokerSource.trim();
    if (isDistWarehouse !== null) baseUpdates.is_distribution_warehouse = isDistWarehouse;

    const newAddress = address.trim();
    const newDisplayAddress = displayAddress.trim();

    const fieldsSet = Object.keys(baseUpdates).length - 1 + (newAddress ? 1 : 0) + (newDisplayAddress ? 1 : 0);
    if (fieldsSet === 0) {
      toast.error('No fields to update — fill in at least one field');
      return;
    }

    setSaving(true);
    try {
      const ids = Array.from(selectedIds);

      if (newAddress) {
        // When address changes, update each listing individually so we can
        // preserve the " — Building X — Unit Y" suffix in display_address.
        const selectedListings = listings.filter(l => selectedIds.has(l.id));
        await Promise.all(
          selectedListings.map(listing => {
            const perRowUpdates: Record<string, unknown> = { ...baseUpdates, address: newAddress };

            if (newDisplayAddress) {
              // User explicitly set a new display address — use it as-is
              perRowUpdates.display_address = newDisplayAddress;
            } else {
              // Reconstruct display_address: replace old address prefix, keep building/unit suffix
              const existing = listing.display_address || listing.address;
              const oldAddress = listing.address;
              if (existing.startsWith(oldAddress)) {
                // e.g. "8919 Barlow Trail SE — Building 1 — Unit A" → "3400 87 Ave SE — Building 1 — Unit A"
                const suffix = existing.slice(oldAddress.length); // " — Building 1 — Unit A"
                perRowUpdates.display_address = newAddress + suffix;
              } else {
                // display_address was manually set differently — just update address, leave display_address alone
              }
            }

            return supabase.from('market_listings').update(perRowUpdates).eq('id', listing.id);
          })
        );
      } else {
        // No address change — single batch update is safe
        if (newDisplayAddress) baseUpdates.display_address = newDisplayAddress;
        const { error } = await supabase
          .from('market_listings')
          .update(baseUpdates)
          .in('id', ids);
        if (error) throw error;
      }

      // Trigger re-geocoding if address or city changed
      if (newAddress || baseUpdates.city) {
        await Promise.allSettled(
          ids.map(id =>
            supabase.functions.invoke('geocode-market-listing', { body: { listingId: id } })
          )
        );
      }

      toast.success(`Updated ${selectedIds.size} listing${selectedIds.size !== 1 ? 's' : ''}`);
      onSaved();
      handleClose();
    } catch (err) {
      console.error('Bulk edit error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update listings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Edit — {selectedIds.size} listing{selectedIds.size !== 1 ? 's' : ''}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-2 mb-1">
          Only fields you fill in will be updated. Leave a field blank to keep existing values.
        </p>

        <div className="space-y-4">
          {/* Address */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Address</Label>
            <Input
              placeholder="— keep existing —"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
          </div>

          {/* Display Address */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Display Address</Label>
            <Input
              placeholder="— keep existing —"
              value={displayAddress}
              onChange={e => setDisplayAddress(e.target.value)}
            />
          </div>

          {/* Submarket */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Submarket</Label>
            <Select value={submarket} onValueChange={setSubmarket}>
              <SelectTrigger>
                <SelectValue placeholder="— keep existing —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSET}>— keep existing —</SelectItem>
                {uniqueSubmarkets.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* City */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">City</Label>
            <Input
              placeholder="— keep existing —"
              value={city}
              onChange={e => setCity(e.target.value)}
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="— keep existing —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSET}>— keep existing —</SelectItem>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Listing Type */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Listing Type</Label>
            <Select value={listingType} onValueChange={setListingType}>
              <SelectTrigger>
                <SelectValue placeholder="— keep existing —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSET}>— keep existing —</SelectItem>
                {LISTING_TYPE_OPTIONS.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Landlord */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Landlord</Label>
            <Input
              placeholder="— keep existing —"
              value={landlord}
              onChange={e => setLandlord(e.target.value)}
            />
          </div>

          {/* Broker Source */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Broker Source</Label>
            <Input
              placeholder="— keep existing —"
              value={brokerSource}
              onChange={e => setBrokerSource(e.target.value)}
            />
          </div>

          {/* Distribution Warehouse */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Distribution Warehouse</Label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="dw"
                  checked={isDistWarehouse === null}
                  onChange={() => setIsDistWarehouse(null)}
                  className="accent-primary"
                />
                Keep existing
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="dw"
                  checked={isDistWarehouse === true}
                  onChange={() => setIsDistWarehouse(true)}
                  className="accent-primary"
                />
                Yes
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="dw"
                  checked={isDistWarehouse === false}
                  onChange={() => setIsDistWarehouse(false)}
                  className="accent-primary"
                />
                No
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : `Update ${selectedIds.size} Listing${selectedIds.size !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
