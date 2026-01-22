import { useState, useEffect } from 'react';
import { AssetWithLinks } from '@/hooks/useAssets';
import {
  Dialog,
  DialogContent,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, User, DollarSign, FileText, Plus, Trash2 } from 'lucide-react';

interface AssetEditDialogProps {
  asset: AssetWithLinks | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (asset: Partial<AssetWithLinks>) => Promise<void>;
  mode: 'create' | 'edit';
}

const PROPERTY_TYPES = [
  'Industrial',
  'Office',
  'Retail',
  'Mixed-Use',
  'Land',
  'Flex',
  'Warehouse',
  'Distribution',
  'Manufacturing',
  'Cold Storage',
  'Data Center',
  'Other'
];

const BUILDING_CLASSES = ['A', 'B', 'C'];

export function AssetEditDialog({
  asset,
  open,
  onOpenChange,
  onSave,
  mode
}: AssetEditDialogProps) {
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('property');

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [displayAddress, setDisplayAddress] = useState('');
  const [displayAddressManuallyEdited, setDisplayAddressManuallyEdited] = useState(false);
  const [city, setCity] = useState('');
  const [submarket, setSubmarket] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [sizeSf, setSizeSf] = useState('');
  const [landAcres, setLandAcres] = useState('');
  const [yearBuilt, setYearBuilt] = useState('');
  const [zoning, setZoning] = useState('');
  const [buildingClass, setBuildingClass] = useState('');
  const [clearHeightFt, setClearHeightFt] = useState('');
  const [dockDoors, setDockDoors] = useState('');
  const [driveInDoors, setDriveInDoors] = useState('');
  const [ownerCompany, setOwnerCompany] = useState('');
  // Contact state - start with no contacts in create mode
  const [contacts, setContacts] = useState<Array<{ name: string; email: string; phone: string }>>([]);
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [assessedValue, setAssessedValue] = useState('');
  const [propertyTaxAnnual, setPropertyTaxAnnual] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

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

  // Populate form when asset changes
  useEffect(() => {
    if (asset) {
      setName(asset.name || '');
      setAddress(asset.address || '');
      setDisplayAddress(asset.display_address || asset.address || '');
      setDisplayAddressManuallyEdited(!!asset.display_address && asset.display_address !== asset.address);
      setCity(asset.city || '');
      setSubmarket(asset.submarket || '');
      setPropertyType(asset.property_type || '');
      setSizeSf(asset.size_sf?.toString() || '');
      setLandAcres(asset.land_acres?.toString() || '');
      setYearBuilt(asset.year_built?.toString() || '');
      setZoning(asset.zoning || '');
      setBuildingClass(asset.building_class || '');
      setClearHeightFt(asset.clear_height_ft?.toString() || '');
      setDockDoors(asset.dock_doors?.toString() || '');
      setDriveInDoors(asset.drive_in_doors?.toString() || '');
      setOwnerCompany(asset.owner_company || '');
      // Load existing contact if present
      if (asset.owner_name || asset.owner_email || asset.owner_phone) {
        setContacts([{ name: asset.owner_name || '', email: asset.owner_email || '', phone: asset.owner_phone || '' }]);
      } else {
        setContacts([]);
      }
      setPurchaseDate(asset.purchase_date || '');
      setPurchasePrice(asset.purchase_price?.toString() || '');
      setAssessedValue(asset.assessed_value?.toString() || '');
      setPropertyTaxAnnual(asset.property_tax_annual?.toString() || '');
      setPhotoUrl(asset.photo_url || '');
      setNotes(asset.notes || '');
      setInternalNotes(asset.internal_notes || '');
    } else {
      // Reset form for create mode
      setName('');
      setAddress('');
      setDisplayAddress('');
      setDisplayAddressManuallyEdited(false);
      setCity('Calgary');
      setSubmarket('');
      setPropertyType('');
      setSizeSf('');
      setLandAcres('');
      setYearBuilt('');
      setZoning('');
      setBuildingClass('');
      setClearHeightFt('');
      setDockDoors('');
      setDriveInDoors('');
      setOwnerCompany('');
      setContacts([]);
      
      setPurchaseDate('');
      setPurchasePrice('');
      setAssessedValue('');
      setPropertyTaxAnnual('');
      setPhotoUrl('');
      setNotes('');
      setInternalNotes('');
    }
    setActiveTab('property');
  }, [asset, open]);

  const handleSave = async () => {
    // Only address is required now
    if (!address.trim()) {
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim() || null,
        address: address.trim(),
        display_address: displayAddress.trim() || null,
        city: city.trim(),
        submarket: submarket.trim(),
        property_type: propertyType || null,
        size_sf: sizeSf ? parseInt(sizeSf) : null,
        land_acres: landAcres ? parseFloat(landAcres) : null,
        year_built: yearBuilt ? parseInt(yearBuilt) : null,
        zoning: zoning.trim() || null,
        building_class: buildingClass || null,
        clear_height_ft: clearHeightFt ? parseFloat(clearHeightFt) : null,
        dock_doors: dockDoors ? parseInt(dockDoors) : null,
        drive_in_doors: driveInDoors ? parseInt(driveInDoors) : null,
        owner_company: ownerCompany.trim() || null,
        // Save first contact (for now, DB only supports one)
        owner_name: contacts[0]?.name?.trim() || null,
        owner_email: contacts[0]?.email?.trim() || null,
        owner_phone: contacts[0]?.phone?.trim() || null,
        purchase_date: purchaseDate || null,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
        assessed_value: assessedValue ? parseFloat(assessedValue) : null,
        property_tax_annual: propertyTaxAnnual ? parseFloat(propertyTaxAnnual) : null,
        photo_url: photoUrl.trim() || null,
        notes: notes.trim() || null,
        internal_notes: internalNotes.trim() || null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Add New Asset' : 'Edit Asset'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="property" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Property</span>
            </TabsTrigger>
            <TabsTrigger value="owner" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Owner</span>
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Financial</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Notes</span>
            </TabsTrigger>
          </TabsList>

          {/* Property Tab */}
          <TabsContent value="property" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Property Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`placeholder-light ${name ? 'input-filled' : ''}`}
                  placeholder="e.g., Blackfoot Industrial Centre"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  className={`placeholder-light ${address ? 'input-filled' : ''}`}
                  placeholder="e.g., 1234 Industrial Way SE"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="displayAddress">Display Address</Label>
                <Input
                  id="displayAddress"
                  value={displayAddress}
                  onChange={(e) => handleDisplayAddressChange(e.target.value)}
                  className={`placeholder-light ${displayAddress ? 'input-filled' : ''}`}
                  placeholder="e.g., 1234 Industrial Way — Unit 4"
                />
              </div>

              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={`placeholder-light ${city ? 'input-filled' : ''}`}
                  placeholder="e.g., Calgary"
                />
              </div>

              <div>
                <Label htmlFor="submarket">Submarket</Label>
                <Input
                  id="submarket"
                  value={submarket}
                  onChange={(e) => setSubmarket(e.target.value)}
                  className={`placeholder-light ${submarket ? 'input-filled' : ''}`}
                  placeholder="e.g., SE Industrial"
                />
              </div>

              <div>
                <Label htmlFor="propertyType">Property Type</Label>
                <Select value={propertyType} onValueChange={setPropertyType}>
                  <SelectTrigger className={propertyType ? 'input-filled' : ''}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="buildingClass">Building Class</Label>
                <Select value={buildingClass} onValueChange={setBuildingClass}>
                  <SelectTrigger className={buildingClass ? 'input-filled' : ''}>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUILDING_CLASSES.map(cls => (
                      <SelectItem key={cls} value={cls}>Class {cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sizeSf">Size (SF)</Label>
                <Input
                  id="sizeSf"
                  type="number"
                  value={sizeSf}
                  onChange={(e) => setSizeSf(e.target.value)}
                  className={`placeholder-light ${sizeSf ? 'input-filled' : ''}`}
                  placeholder="e.g., 100000"
                />
              </div>

              <div>
                <Label htmlFor="landAcres">Land (Acres)</Label>
                <Input
                  id="landAcres"
                  type="number"
                  step="0.01"
                  value={landAcres}
                  onChange={(e) => setLandAcres(e.target.value)}
                  className={`placeholder-light ${landAcres ? 'input-filled' : ''}`}
                  placeholder="e.g., 5.5"
                />
              </div>

              <div>
                <Label htmlFor="yearBuilt">Year Built</Label>
                <Input
                  id="yearBuilt"
                  type="number"
                  value={yearBuilt}
                  onChange={(e) => setYearBuilt(e.target.value)}
                  className={`placeholder-light ${yearBuilt ? 'input-filled' : ''}`}
                  placeholder="e.g., 2010"
                />
              </div>

              <div>
                <Label htmlFor="zoning">Zoning</Label>
                <Input
                  id="zoning"
                  value={zoning}
                  onChange={(e) => setZoning(e.target.value)}
                  className={`placeholder-light ${zoning ? 'input-filled' : ''}`}
                  placeholder="e.g., I-G"
                />
              </div>

              <div>
                <Label htmlFor="clearHeightFt">Clear Height (ft)</Label>
                <Input
                  id="clearHeightFt"
                  type="number"
                  step="0.1"
                  value={clearHeightFt}
                  onChange={(e) => setClearHeightFt(e.target.value)}
                  className={`placeholder-light ${clearHeightFt ? 'input-filled' : ''}`}
                  placeholder="e.g., 32"
                />
              </div>

              <div>
                <Label htmlFor="dockDoors">Dock Doors</Label>
                <Input
                  id="dockDoors"
                  type="number"
                  value={dockDoors}
                  onChange={(e) => setDockDoors(e.target.value)}
                  className={`placeholder-light ${dockDoors ? 'input-filled' : ''}`}
                  placeholder="e.g., 8"
                />
              </div>

              <div>
                <Label htmlFor="driveInDoors">Drive-In Doors</Label>
                <Input
                  id="driveInDoors"
                  type="number"
                  value={driveInDoors}
                  onChange={(e) => setDriveInDoors(e.target.value)}
                  className={`placeholder-light ${driveInDoors ? 'input-filled' : ''}`}
                  placeholder="e.g., 2"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="photoUrl">Photo URL</Label>
                <Input
                  id="photoUrl"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className={`placeholder-light ${photoUrl ? 'input-filled' : ''}`}
                  placeholder="e.g., https://..."
                />
              </div>
            </div>
          </TabsContent>

          {/* Owner Tab */}
          <TabsContent value="owner" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="ownerCompany">Owner Company</Label>
                <Input
                  id="ownerCompany"
                  value={ownerCompany}
                  onChange={(e) => setOwnerCompany(e.target.value)}
                  className={`placeholder-light ${ownerCompany ? 'input-filled' : ''}`}
                  placeholder="e.g., Bentall Kennedy"
                />
              </div>

              {/* Contact Cards */}
              {contacts.map((contact, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3 relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Contact {index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setContacts(contacts.filter((_, i) => i !== index))}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <Label>Contact Name</Label>
                    <Input
                      value={contact.name}
                      onChange={(e) => {
                        const newContacts = [...contacts];
                        newContacts[index].name = e.target.value;
                        setContacts(newContacts);
                      }}
                      className={`placeholder-light ${contact.name ? 'input-filled' : ''}`}
                      placeholder="e.g., John Smith"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={contact.email}
                        onChange={(e) => {
                          const newContacts = [...contacts];
                          newContacts[index].email = e.target.value;
                          setContacts(newContacts);
                        }}
                        className={`placeholder-light ${contact.email ? 'input-filled' : ''}`}
                        placeholder="e.g., john@example.com"
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={contact.phone}
                        onChange={(e) => {
                          const newContacts = [...contacts];
                          newContacts[index].phone = e.target.value;
                          setContacts(newContacts);
                        }}
                        className={`placeholder-light ${contact.phone ? 'input-filled' : ''}`}
                        placeholder="e.g., (403) 555-1234"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Contact Button */}
              <Button
                type="button"
                variant="outline"
                onClick={() => setContacts([...contacts, { name: '', email: '', phone: '' }])}
                className="w-full border-dashed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </div>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purchaseDate">Purchase Date</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className={purchaseDate ? 'input-filled' : ''}
                />
              </div>

              <div>
                <Label htmlFor="purchasePrice">Purchase Price ($)</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className={`placeholder-light ${purchasePrice ? 'input-filled' : ''}`}
                  placeholder="e.g., 15000000"
                />
              </div>

              <div>
                <Label htmlFor="assessedValue">Assessed Value ($)</Label>
                <Input
                  id="assessedValue"
                  type="number"
                  value={assessedValue}
                  onChange={(e) => setAssessedValue(e.target.value)}
                  className={`placeholder-light ${assessedValue ? 'input-filled' : ''}`}
                  placeholder="e.g., 12000000"
                />
              </div>

              <div>
                <Label htmlFor="propertyTaxAnnual">Annual Property Tax ($)</Label>
                <Input
                  id="propertyTaxAnnual"
                  type="number"
                  value={propertyTaxAnnual}
                  onChange={(e) => setPropertyTaxAnnual(e.target.value)}
                  className={`placeholder-light ${propertyTaxAnnual ? 'input-filled' : ''}`}
                  placeholder="e.g., 150000"
                />
              </div>
            </div>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={notes ? 'input-filled' : ''}
                placeholder="General notes about the property..."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="internalNotes">Internal Notes</Label>
              <Textarea
                id="internalNotes"
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                className={internalNotes ? 'input-filled' : ''}
                placeholder="Internal team notes (not shared)..."
                rows={4}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !address.trim()}>
            {saving ? 'Saving...' : mode === 'create' ? 'Create Asset' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
