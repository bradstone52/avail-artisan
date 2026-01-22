import { useState, useEffect, useRef } from 'react';
import { AssetWithLinks, AssetPhoto } from '@/hooks/useAssets';
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
import { Building2, User, DollarSign, FileText, Plus, Trash2, Upload, X, Briefcase, Image, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

// Format number with commas
const formatNumberWithCommas = (value: string): string => {
  const num = value.replace(/[^\d]/g, '');
  if (!num) return '';
  return parseInt(num).toLocaleString('en-US');
};

// Parse formatted number back to raw digits
const parseFormattedNumber = (value: string): string => {
  return value.replace(/[^\d]/g, '');
};

// Format currency with $ and commas
const formatCurrency = (value: string): string => {
  const num = value.replace(/[^\d.]/g, '');
  if (!num) return '';
  const parsed = parseFloat(num);
  if (isNaN(parsed)) return '';
  return parsed.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

// Parse currency back to raw number string
const parseCurrency = (value: string): string => {
  return value.replace(/[^\d.]/g, '');
};

interface PhotoItem {
  id?: string;
  photo_url: string;
  caption: string | null;
  sort_order: number;
  isNew?: boolean;
  toDelete?: boolean;
}

export function AssetEditDialog({
  asset,
  open,
  onOpenChange,
  onSave,
  mode
}: AssetEditDialogProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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
  // Owner contacts
  const [ownerContacts, setOwnerContacts] = useState<Array<{ name: string; email: string; phone: string }>>([]);
  // Asset Manager contacts
  const [assetManagerContacts, setAssetManagerContacts] = useState<Array<{ name: string; email: string; phone: string }>>([]);
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [assessedValue, setAssessedValue] = useState('');
  const [propertyTaxAnnual, setPropertyTaxAnnual] = useState('');
  // Multiple photos
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
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

  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
          toast.error(`${file.name}: Please upload a JPG, PNG, or WEBP image`);
          continue;
        }

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name}: Image must be less than 10MB`);
          continue;
        }

        const ext = file.name.split('.').pop();
        const filename = `${user.id}/asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;

        const { data, error } = await supabase.storage
          .from('asset-photos')
          .upload(filename, file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (error) {
          toast.error(`${file.name}: ${error.message}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('asset-photos')
          .getPublicUrl(data.path);

        // Add to photos array
        setPhotos(prev => [...prev, {
          photo_url: urlData.publicUrl,
          caption: null,
          sort_order: prev.length,
          isNew: true
        }]);
      }
      toast.success('Photos uploaded');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload photos');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove photo
  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => {
      const photo = prev[index];
      if (photo.id) {
        // Existing photo - mark for deletion
        return prev.map((p, i) => i === index ? { ...p, toDelete: true } : p);
      } else {
        // New photo - just remove from array
        return prev.filter((_, i) => i !== index);
      }
    });
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
      // Load existing owner contact if present
      if (asset.owner_name || asset.owner_email || asset.owner_phone) {
        setOwnerContacts([{ name: asset.owner_name || '', email: asset.owner_email || '', phone: asset.owner_phone || '' }]);
      } else {
        setOwnerContacts([]);
      }
      // Asset manager contacts not stored in DB yet - start empty
      setAssetManagerContacts([]);
      setPurchaseDate(asset.purchase_date || '');
      setPurchasePrice(asset.purchase_price?.toString() || '');
      setAssessedValue(asset.assessed_value?.toString() || '');
      setPropertyTaxAnnual(asset.property_tax_annual?.toString() || '');
      // Load photos
      if (asset.photos && asset.photos.length > 0) {
        setPhotos(asset.photos.map(p => ({
          id: p.id,
          photo_url: p.photo_url,
          caption: p.caption,
          sort_order: p.sort_order
        })));
      } else if (asset.photo_url) {
        // Migrate legacy single photo
        setPhotos([{
          photo_url: asset.photo_url,
          caption: null,
          sort_order: 0,
          isNew: true // Will be saved as new photo record
        }]);
      } else {
        setPhotos([]);
      }
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
      setOwnerContacts([]);
      setAssetManagerContacts([]);
      setPurchaseDate('');
      setPurchasePrice('');
      setAssessedValue('');
      setPropertyTaxAnnual('');
      setPhotos([]);
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
      // Save asset first
      await onSave({
        name: name.trim() || null,
        address: address.trim(),
        display_address: displayAddress.trim() || null,
        city: city.trim(),
        submarket: submarket.trim(),
        property_type: propertyType || null,
        size_sf: sizeSf ? parseInt(parseFormattedNumber(sizeSf)) : null,
        land_acres: landAcres ? parseFloat(landAcres) : null,
        year_built: yearBuilt ? parseInt(yearBuilt) : null,
        zoning: zoning.trim() || null,
        building_class: buildingClass || null,
        clear_height_ft: clearHeightFt ? parseFloat(clearHeightFt) : null,
        dock_doors: dockDoors ? parseInt(parseFormattedNumber(dockDoors)) : null,
        drive_in_doors: driveInDoors ? parseInt(parseFormattedNumber(driveInDoors)) : null,
        owner_company: ownerCompany.trim() || null,
        // Save first owner contact (for now, DB only supports one)
        owner_name: ownerContacts[0]?.name?.trim() || null,
        owner_email: ownerContacts[0]?.email?.trim() || null,
        owner_phone: ownerContacts[0]?.phone?.trim() || null,
        purchase_date: purchaseDate || null,
        purchase_price: purchasePrice ? parseFloat(parseCurrency(purchasePrice)) : null,
        assessed_value: assessedValue ? parseFloat(parseCurrency(assessedValue)) : null,
        property_tax_annual: propertyTaxAnnual ? parseFloat(parseCurrency(propertyTaxAnnual)) : null,
        photo_url: photos.filter(p => !p.toDelete)[0]?.photo_url || null, // Keep legacy field updated
        notes: notes.trim() || null,
        internal_notes: internalNotes.trim() || null,
      });

      // Now handle photos if we're editing an existing asset
      if (asset?.id) {
        // Delete photos marked for deletion
        const photosToDelete = photos.filter(p => p.toDelete && p.id);
        for (const photo of photosToDelete) {
          await supabase.from('asset_photos').delete().eq('id', photo.id);
        }

        // Insert new photos
        const newPhotos = photos.filter(p => p.isNew && !p.toDelete);
        for (let i = 0; i < newPhotos.length; i++) {
          const photo = newPhotos[i];
          await supabase.from('asset_photos').insert({
            asset_id: asset.id,
            photo_url: photo.photo_url,
            caption: photo.caption,
            sort_order: photos.filter(p => !p.toDelete).indexOf(photo),
            created_by: user?.id
          });
        }
      }
    } finally {
      setSaving(false);
    }
  };

  // Render contact card
  const renderContactCard = (
    contact: { name: string; email: string; phone: string },
    index: number,
    contacts: Array<{ name: string; email: string; phone: string }>,
    setContacts: React.Dispatch<React.SetStateAction<Array<{ name: string; email: string; phone: string }>>>,
    label: string
  ) => (
    <div key={index} className="border rounded-lg p-4 space-y-3 relative">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">{label} {index + 1}</span>
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
  );

  const visiblePhotos = photos.filter(p => !p.toDelete);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Add New Asset' : 'Edit Asset'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="property" className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Property</span>
            </TabsTrigger>
            <TabsTrigger value="photos" className="flex items-center gap-1">
              <Image className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Photos</span>
              {visiblePhotos.length > 0 && (
                <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1.5">
                  {visiblePhotos.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="owner" className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Owner</span>
            </TabsTrigger>
            <TabsTrigger value="manager" className="flex items-center gap-1">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Manager</span>
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Financial</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Notes</span>
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
                  value={sizeSf ? formatNumberWithCommas(sizeSf) : ''}
                  onChange={(e) => setSizeSf(parseFormattedNumber(e.target.value))}
                  className={`placeholder-light ${sizeSf ? 'input-filled' : ''}`}
                  placeholder="e.g., 100,000"
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
                  value={dockDoors ? formatNumberWithCommas(dockDoors) : ''}
                  onChange={(e) => setDockDoors(parseFormattedNumber(e.target.value))}
                  className={`placeholder-light ${dockDoors ? 'input-filled' : ''}`}
                  placeholder="e.g., 8"
                />
              </div>

              <div>
                <Label htmlFor="driveInDoors">Drive-In Doors</Label>
                <Input
                  id="driveInDoors"
                  value={driveInDoors ? formatNumberWithCommas(driveInDoors) : ''}
                  onChange={(e) => setDriveInDoors(parseFormattedNumber(e.target.value))}
                  className={`placeholder-light ${driveInDoors ? 'input-filled' : ''}`}
                  placeholder="e.g., 2"
                />
              </div>
            </div>
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos" className="space-y-4 mt-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
            />
            
            {/* Photo Gallery Grid */}
            {visiblePhotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {visiblePhotos.map((photo, index) => (
                  <div key={photo.id || photo.photo_url} className="relative group aspect-square">
                    <img 
                      src={photo.photo_url} 
                      alt={photo.caption || `Photo ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemovePhoto(photos.findIndex(p => p === photo))}
                      className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    {photo.isNew && (
                      <span className="absolute bottom-2 left-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                        New
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add Photos Button */}
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full border-dashed h-24"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Add Photos
                </>
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              Upload JPG, PNG, or WEBP images (max 10MB each)
            </p>
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

              {/* Owner Contact Cards */}
              {ownerContacts.map((contact, index) => 
                renderContactCard(contact, index, ownerContacts, setOwnerContacts, 'Contact')
              )}

              {/* Add Contact Button */}
              <Button
                type="button"
                variant="outline"
                onClick={() => setOwnerContacts([...ownerContacts, { name: '', email: '', phone: '' }])}
                className="w-full border-dashed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </div>
          </TabsContent>

          {/* Asset Manager Tab */}
          <TabsContent value="manager" className="space-y-4 mt-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add asset management contacts for this property.
              </p>

              {/* Asset Manager Contact Cards */}
              {assetManagerContacts.map((contact, index) => 
                renderContactCard(contact, index, assetManagerContacts, setAssetManagerContacts, 'Asset Manager')
              )}

              {/* Add Contact Button */}
              <Button
                type="button"
                variant="outline"
                onClick={() => setAssetManagerContacts([...assetManagerContacts, { name: '', email: '', phone: '' }])}
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
                <Label htmlFor="purchasePrice">Purchase Price</Label>
                <Input
                  id="purchasePrice"
                  value={purchasePrice ? formatCurrency(purchasePrice) : ''}
                  onChange={(e) => setPurchasePrice(parseCurrency(e.target.value))}
                  className={`placeholder-light ${purchasePrice ? 'input-filled' : ''}`}
                  placeholder="e.g., $15,000,000"
                />
              </div>

              <div>
                <Label htmlFor="assessedValue">Assessed Value</Label>
                <Input
                  id="assessedValue"
                  value={assessedValue ? formatCurrency(assessedValue) : ''}
                  onChange={(e) => setAssessedValue(parseCurrency(e.target.value))}
                  className={`placeholder-light ${assessedValue ? 'input-filled' : ''}`}
                  placeholder="e.g., $12,000,000"
                />
              </div>

              <div>
                <Label htmlFor="propertyTaxAnnual">Annual Property Tax</Label>
                <Input
                  id="propertyTaxAnnual"
                  value={propertyTaxAnnual ? formatCurrency(propertyTaxAnnual) : ''}
                  onChange={(e) => setPropertyTaxAnnual(parseCurrency(e.target.value))}
                  className={`placeholder-light ${propertyTaxAnnual ? 'input-filled' : ''}`}
                  placeholder="e.g., $150,000"
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
