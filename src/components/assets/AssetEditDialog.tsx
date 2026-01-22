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
import { Building2, User, DollarSign, FileText } from 'lucide-react';

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
  const [ownerName, setOwnerName] = useState('');
  const [ownerCompany, setOwnerCompany] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [assessedValue, setAssessedValue] = useState('');
  const [propertyTaxAnnual, setPropertyTaxAnnual] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Populate form when asset changes
  useEffect(() => {
    if (asset) {
      setName(asset.name || '');
      setAddress(asset.address || '');
      setDisplayAddress(asset.display_address || '');
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
      setOwnerName(asset.owner_name || '');
      setOwnerCompany(asset.owner_company || '');
      setOwnerEmail(asset.owner_email || '');
      setOwnerPhone(asset.owner_phone || '');
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
      setCity('');
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
      setOwnerName('');
      setOwnerCompany('');
      setOwnerEmail('');
      setOwnerPhone('');
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
    if (!name.trim() || !address.trim()) {
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
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
        owner_name: ownerName.trim() || null,
        owner_company: ownerCompany.trim() || null,
        owner_email: ownerEmail.trim() || null,
        owner_phone: ownerPhone.trim() || null,
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
                <Label htmlFor="name">Property Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Blackfoot Industrial Centre"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g., 1234 Industrial Way SE"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="displayAddress">Display Address</Label>
                <Input
                  id="displayAddress"
                  value={displayAddress}
                  onChange={(e) => setDisplayAddress(e.target.value)}
                  placeholder="Optional shortened address"
                />
              </div>

              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Calgary"
                />
              </div>

              <div>
                <Label htmlFor="submarket">Submarket</Label>
                <Input
                  id="submarket"
                  value={submarket}
                  onChange={(e) => setSubmarket(e.target.value)}
                  placeholder="SE Industrial"
                />
              </div>

              <div>
                <Label htmlFor="propertyType">Property Type</Label>
                <Select value={propertyType} onValueChange={setPropertyType}>
                  <SelectTrigger>
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
                  <SelectTrigger>
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
                  placeholder="100000"
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
                  placeholder="5.5"
                />
              </div>

              <div>
                <Label htmlFor="yearBuilt">Year Built</Label>
                <Input
                  id="yearBuilt"
                  type="number"
                  value={yearBuilt}
                  onChange={(e) => setYearBuilt(e.target.value)}
                  placeholder="2010"
                />
              </div>

              <div>
                <Label htmlFor="zoning">Zoning</Label>
                <Input
                  id="zoning"
                  value={zoning}
                  onChange={(e) => setZoning(e.target.value)}
                  placeholder="I-G"
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
                  placeholder="32"
                />
              </div>

              <div>
                <Label htmlFor="dockDoors">Dock Doors</Label>
                <Input
                  id="dockDoors"
                  type="number"
                  value={dockDoors}
                  onChange={(e) => setDockDoors(e.target.value)}
                  placeholder="8"
                />
              </div>

              <div>
                <Label htmlFor="driveInDoors">Drive-In Doors</Label>
                <Input
                  id="driveInDoors"
                  type="number"
                  value={driveInDoors}
                  onChange={(e) => setDriveInDoors(e.target.value)}
                  placeholder="2"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="photoUrl">Photo URL</Label>
                <Input
                  id="photoUrl"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
          </TabsContent>

          {/* Owner Tab */}
          <TabsContent value="owner" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="ownerCompany">Owner Company</Label>
                <Input
                  id="ownerCompany"
                  value={ownerCompany}
                  onChange={(e) => setOwnerCompany(e.target.value)}
                  placeholder="e.g., Bentall Kennedy"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="ownerName">Contact Name</Label>
                <Input
                  id="ownerName"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="John Smith"
                />
              </div>

              <div>
                <Label htmlFor="ownerEmail">Email</Label>
                <Input
                  id="ownerEmail"
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <Label htmlFor="ownerPhone">Phone</Label>
                <Input
                  id="ownerPhone"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  placeholder="(403) 555-1234"
                />
              </div>
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
                />
              </div>

              <div>
                <Label htmlFor="purchasePrice">Purchase Price ($)</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="15000000"
                />
              </div>

              <div>
                <Label htmlFor="assessedValue">Assessed Value ($)</Label>
                <Input
                  id="assessedValue"
                  type="number"
                  value={assessedValue}
                  onChange={(e) => setAssessedValue(e.target.value)}
                  placeholder="12000000"
                />
              </div>

              <div>
                <Label htmlFor="propertyTaxAnnual">Annual Property Tax ($)</Label>
                <Input
                  id="propertyTaxAnnual"
                  type="number"
                  value={propertyTaxAnnual}
                  onChange={(e) => setPropertyTaxAnnual(e.target.value)}
                  placeholder="150000"
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
          <Button onClick={handleSave} disabled={saving || !name.trim() || !address.trim()}>
            {saving ? 'Saving...' : mode === 'create' ? 'Create Asset' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
