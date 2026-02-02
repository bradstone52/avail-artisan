import { useState, useEffect, useRef, useCallback } from 'react';
import { PropertyWithLinks, PropertyPhoto } from '@/hooks/useProperties';
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
import { Building2, FileText, Plus, Trash2, Upload, X, Image, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CityCombobox } from '@/components/common/CityCombobox';

interface PropertyEditDialogProps {
  property: PropertyWithLinks | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (property: Partial<PropertyWithLinks>) => Promise<void>;
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

interface PhotoItem {
  id?: string;
  photo_url: string;
  caption: string | null;
  sort_order: number;
  isNew?: boolean;
  toDelete?: boolean;
}

export function PropertyEditDialog({
  property,
  open,
  onOpenChange,
  onSave,
  mode
}: PropertyEditDialogProps) {
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
  const [cityLookupAddress, setCityLookupAddress] = useState('');
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
      setDisplayAddressManuallyEdited(false);
      setDisplayAddress(address);
    } else if (value !== address) {
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
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
          toast.error(`${file.name}: Please upload a JPG, PNG, or WEBP image`);
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name}: Image must be less than 10MB`);
          continue;
        }

        const ext = file.name.split('.').pop();
        const filename = `${user.id}/property-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;

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
        return prev.map((p, i) => i === index ? { ...p, toDelete: true } : p);
      } else {
        return prev.filter((_, i) => i !== index);
      }
    });
  };

  // Populate form when property changes
  useEffect(() => {
    if (property) {
      setName(property.name || '');
      setAddress(property.address || '');
      setDisplayAddress(property.display_address || property.address || '');
      setDisplayAddressManuallyEdited(!!property.display_address && property.display_address !== property.address);
      setCityLookupAddress(property.city_lookup_address || '');
      setCity(property.city || '');
      setSubmarket(property.submarket || '');
      setPropertyType(property.property_type || '');
      setSizeSf(property.size_sf?.toString() || '');
      setLandAcres(property.land_acres?.toString() || '');
      setYearBuilt(property.year_built?.toString() || '');
      setZoning(property.zoning || '');
      setBuildingClass(property.building_class || '');
      setClearHeightFt(property.clear_height_ft?.toString() || '');
      setDockDoors(property.dock_doors?.toString() || '');
      setDriveInDoors(property.drive_in_doors?.toString() || '');
      if (property.photos && property.photos.length > 0) {
        setPhotos(property.photos.map(p => ({
          id: p.id,
          photo_url: p.photo_url,
          caption: p.caption,
          sort_order: p.sort_order
        })));
      } else if (property.photo_url) {
        setPhotos([{
          photo_url: property.photo_url,
          caption: null,
          sort_order: 0,
          isNew: true
        }]);
      } else {
        setPhotos([]);
      }
      setNotes(property.notes || '');
      setInternalNotes(property.internal_notes || '');
    } else {
      // Reset form for create mode
      setName('');
      setAddress('');
      setDisplayAddress('');
      setDisplayAddressManuallyEdited(false);
      setCityLookupAddress('');
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
      setPhotos([]);
      setNotes('');
      setInternalNotes('');
    }
    setActiveTab('property');
  }, [property, open]);

  const handleSave = async () => {
    if (!address.trim()) {
      toast.error('Address is required');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim() || address.trim(),
        address: address.trim(),
        display_address: displayAddress.trim() || null,
        city_lookup_address: cityLookupAddress.trim() || null,
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
        photo_url: photos.filter(p => !p.toDelete)[0]?.photo_url || null,
        notes: notes.trim() || null,
        internal_notes: internalNotes.trim() || null,
      });

      // Handle photos if editing existing property
      if (property?.id) {
        const photosToDelete = photos.filter(p => p.toDelete && p.id);
        for (const photo of photosToDelete) {
          await supabase.from('property_photos').delete().eq('id', photo.id);
        }

        const newPhotos = photos.filter(p => p.isNew && !p.toDelete);
        for (let i = 0; i < newPhotos.length; i++) {
          const photo = newPhotos[i];
          await supabase.from('property_photos').insert({
            property_id: property.id,
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

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const visiblePhotos = photos.filter(p => !p.toDelete);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        preventOutsideClose
        onCloseClick={handleClose}
      >
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Add New Property' : 'Edit Property'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="property" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="photos" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Photos
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notes
            </TabsTrigger>
          </TabsList>

          {/* Property Details Tab */}
          <TabsContent value="property" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Property Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Foothills Industrial Park"
                  className={name ? 'input-filled' : ''}
                />
              </div>

              <div className="col-span-2">
                <Label>Address *</Label>
                <Input
                  value={address}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  placeholder="e.g., 123 Industrial Way SE"
                  className={address ? 'input-filled' : ''}
                />
              </div>

              <div className="col-span-2">
                <Label>Display Address</Label>
                <Input
                  value={displayAddress}
                  onChange={(e) => handleDisplayAddressChange(e.target.value)}
                  placeholder="Optional: shown in reports"
                  className={displayAddress !== address ? 'input-filled' : ''}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave blank to use address
                </p>
              </div>

              <div className="col-span-2">
                <Label>City Lookup Address</Label>
                <Input
                  value={cityLookupAddress}
                  onChange={(e) => setCityLookupAddress(e.target.value)}
                  placeholder="Override for City of Calgary lookups"
                  className={cityLookupAddress ? 'input-filled' : ''}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional. Use if city database uses different format (e.g., 5353 72 AV SE)
                </p>
              </div>

              <div>
                <Label>City</Label>
                <CityCombobox 
                  value={city} 
                  onChange={setCity}
                  placeholder="Calgary"
                />
              </div>

              <div>
                <Label>Submarket</Label>
                <Input
                  value={submarket}
                  onChange={(e) => setSubmarket(e.target.value)}
                  placeholder="e.g., SE Industrial"
                  className={submarket ? 'input-filled' : ''}
                />
              </div>

              <div>
                <Label>Property Type</Label>
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
                <Label>Building Class</Label>
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
                <Label>Size (SF)</Label>
                <Input
                  value={formatNumberWithCommas(sizeSf)}
                  onChange={(e) => setSizeSf(parseFormattedNumber(e.target.value))}
                  placeholder="e.g., 50,000"
                  className={sizeSf ? 'input-filled' : ''}
                />
              </div>

              <div>
                <Label>Land (Acres)</Label>
                <Input
                  value={landAcres}
                  onChange={(e) => setLandAcres(e.target.value)}
                  placeholder="e.g., 2.5"
                  className={landAcres ? 'input-filled' : ''}
                />
              </div>

              <div>
                <Label>Year Built</Label>
                <Input
                  value={yearBuilt}
                  onChange={(e) => setYearBuilt(e.target.value)}
                  placeholder="e.g., 2005"
                  className={yearBuilt ? 'input-filled' : ''}
                />
              </div>

              <div>
                <Label>Zoning</Label>
                <Input
                  value={zoning}
                  onChange={(e) => setZoning(e.target.value)}
                  placeholder="e.g., I-G"
                  className={zoning ? 'input-filled' : ''}
                />
              </div>

              <div>
                <Label>Clear Height (ft)</Label>
                <Input
                  value={clearHeightFt}
                  onChange={(e) => setClearHeightFt(e.target.value)}
                  placeholder="e.g., 28"
                  className={clearHeightFt ? 'input-filled' : ''}
                />
              </div>

              <div>
                <Label>Dock Doors</Label>
                <Input
                  value={formatNumberWithCommas(dockDoors)}
                  onChange={(e) => setDockDoors(parseFormattedNumber(e.target.value))}
                  placeholder="e.g., 12"
                  className={dockDoors ? 'input-filled' : ''}
                />
              </div>

              <div>
                <Label>Drive-In Doors</Label>
                <Input
                  value={formatNumberWithCommas(driveInDoors)}
                  onChange={(e) => setDriveInDoors(parseFormattedNumber(e.target.value))}
                  placeholder="e.g., 2"
                  className={driveInDoors ? 'input-filled' : ''}
                />
              </div>
            </div>
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Property Photos</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload Photos
                </Button>
              </div>

              {visiblePhotos.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {visiblePhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo.photo_url}
                        alt={`Property photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemovePhoto(photos.indexOf(photo))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                  <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No photos yet. Upload photos to showcase this property.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-4 mt-4">
            <div>
              <Label>Public Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes visible in reports..."
                rows={4}
                className={notes ? 'input-filled' : ''}
              />
            </div>

            <div>
              <Label>Internal Notes</Label>
              <Textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Private notes (not shown in reports)..."
                rows={4}
                className={internalNotes ? 'input-filled' : ''}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !address.trim()}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              mode === 'create' ? 'Create Property' : 'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
