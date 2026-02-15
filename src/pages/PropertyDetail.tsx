import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { usePropertyDetail, PropertyBrochure, PropertyPermit, PropertyTransaction } from '@/hooks/useProperties';
import { usePropertyTenants } from '@/hooks/usePropertyTenants';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useMillRate } from '@/hooks/useMillRate';
import { formatSubmarket } from '@/lib/formatters';
import {
  ArrowLeft,
  Building2,
  MapPin,
  FileText,
  Image,
  Download,
  RefreshCw,
  ExternalLink,
  Calendar,
  DollarSign,
  Loader2,
  HardHat,
  ClipboardList,
  Link as LinkIcon,
  Archive,
  Receipt,
  Users,
  Pencil,
  Upload,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { TenantsSection } from '@/components/properties/TenantsSection';
import { PropertyEditDialog } from '@/components/properties/PropertyEditDialog';
import { CityDataNotFoundDialog } from '@/components/properties/CityDataNotFoundDialog';
import { CityParcelPickerDialog } from '@/components/properties/CityParcelPickerDialog';
import { EditPropertyPinDialog } from '@/components/properties/EditPropertyPinDialog';
import { PropertyWithLinks } from '@/hooks/useProperties';

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { property, brochures, permits, transactions, loading, refetch } = usePropertyDetail(id);
  const { tenants, fetchTenants } = usePropertyTenants(id);
  const { rate: millRate, year: millRateYear } = useMillRate();
  
  const [fetchingCityData, setFetchingCityData] = useState(false);
  const [downloadingBrochure, setDownloadingBrochure] = useState<string | null>(null);
  const [downloadingAllBrochures, setDownloadingAllBrochures] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [cityDataNotFoundOpen, setCityDataNotFoundOpen] = useState(false);
  const [parcelPickerOpen, setParcelPickerOpen] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [uploadingBrochure, setUploadingBrochure] = useState(false);

  // Open My Property map with coordinates (same as CityParcelPickerDialog)
  const handleOpenMyProperty = async () => {
    if (!property) return;
    
    let lng = property.longitude;
    let lat = property.latitude;
    
    // If no coordinates, geocode the address first
    if (!lng || !lat) {
      try {
        const { data, error } = await supabase.functions.invoke('get-google-maps-token', {
          body: { authenticated: true },
        });
        
        if (error || !data?.apiKey) {
          throw new Error('Failed to get Google Maps API key');
        }
        
        const searchAddress = property.city_lookup_address || property.address;
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchAddress + ', ' + property.city)}&key=${data.apiKey}&region=CA`
        );
        const geocodeData = await response.json();
        
        if (geocodeData.status === 'OK' && geocodeData.results.length > 0) {
          const location = geocodeData.results[0].geometry.location;
          lng = location.lng;
          lat = location.lat;
        } else {
          toast({
            title: 'Could not locate address',
            description: 'Unable to geocode the property address.',
            variant: 'destructive'
          });
          return;
        }
      } catch (err) {
        console.error('Geocoding error:', err);
        toast({
          title: 'Error',
          description: 'Failed to geocode address for map lookup.',
          variant: 'destructive'
        });
        return;
      }
    }
    
    // Same URL format as CityParcelPickerDialog
    const url = `https://maps.calgary.ca/myproperty/?find=${lng},${lat}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Fetch tenants when property id changes
  useEffect(() => {
    if (id) {
      fetchTenants(id);
    }
  }, [id, fetchTenants]);

  // Handle property save
  const handleSaveProperty = async (updates: Partial<PropertyWithLinks>) => {
    if (!property) return;
    
    try {
      // Extract only the fields that can be directly updated
      const {
        photos: _photos,
        linked_listings: _linked,
        active_listing_count: _count,
        transactions: _txns,
        city_data_raw,
        ...updateFields
      } = updates;

      const { error } = await supabase
        .from('properties')
        .update(updateFields)
        .eq('id', property.id);

      if (error) throw error;

       // Auto-populate submarket on save for Calgary properties (same behavior as Market Listings)
       // We run this when saving if the address/city was updated OR if submarket is empty.
       const nextCity = String((updateFields as any).city ?? property.city ?? '');
       const nextAddress = String((updateFields as any).address ?? property.address ?? '');
       const nextSubmarket = (updateFields as any).submarket ?? property.submarket;
       const shouldAutoGeocode =
         nextCity.toLowerCase().includes('calgary') &&
         !!nextAddress &&
         (!!(updateFields as any).address || !!(updateFields as any).city || !nextSubmarket);

       if (shouldAutoGeocode) {
         // Fire and forget, but refetch once it completes so UI updates
         supabase.functions
           .invoke('geocode-property', {
             body: {
               propertyId: property.id,
               address: nextAddress,
               city: nextCity,
             },
           })
           .then(() => refetch())
           .catch((err) => console.error('Error geocoding property:', err));
       }

      toast({ title: 'Property updated successfully' });
      setEditDialogOpen(false);
      refetch();
    } catch (error: any) {
      console.error('Error updating property:', error);
      toast({
        title: 'Error updating property',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Fetch City of Calgary data
  const handleFetchCityData = async (overrideAddress?: string) => {
    if (!property) return;
    
    const addressToUse = overrideAddress || property.address;
    const isCalgary = (property.city || '').toLowerCase().includes('calgary');
    
    setFetchingCityData(true);
    try {
      // For Calgary properties, also call geocode-property to ensure submarket is set via ArcGIS
      // This handles cases where the property was auto-created (e.g., from a transaction) without geocoding
      if (isCalgary) {
        await supabase.functions.invoke('geocode-property', {
          body: {
            propertyId: property.id,
            address: addressToUse,
            city: property.city,
          },
        });
      }

      const { data, error } = await supabase.functions.invoke('fetch-city-data', {
        body: { propertyId: property.id, address: addressToUse, city: property.city }
      });

      if (error) throw error;

      // If we can't find an assessment match, treat the address as "not found" for city records
      // and offer nearby address suggestions.
      if (data?.assessmentFound === false) {
        toast({
          title: 'No city records found',
          description: 'This address was not found in the city assessment database. Try a nearby address format.',
          variant: 'destructive'
        });
        setCityDataNotFoundOpen(true);
        refetch();
      } else {
        toast({ 
          title: 'City data fetched successfully',
          description: `Found assessment data and ${data?.permitsFound || 0} permit(s).`
        });
        refetch();
      }
    } catch (error: any) {
      console.error('Error fetching city data:', error);
      toast({
        title: 'Error fetching city data',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setFetchingCityData(false);
    }
  };

  // Handle retry with suggested address
  const handleRetryWithAddress = async (newAddress: string) => {
    // Update the property's address first, then fetch city data
    if (!property) return;
    
    try {
      const { error } = await supabase
        .from('properties')
        .update({ address: newAddress })
        .eq('id', property.id);

      if (error) throw error;

      toast({ title: 'Address updated', description: `Trying "${newAddress}"...` });

      // Also auto-assign submarket when we change the address
      if ((property.city || '').toLowerCase().includes('calgary')) {
        supabase.functions
          .invoke('geocode-property', {
            body: {
              propertyId: property.id,
              address: newAddress,
              city: property.city,
            },
          })
          .then(() => refetch())
          .catch((err) => console.error('Error geocoding property:', err));
      }
      
      // Now fetch city data with the new address
      await handleFetchCityData(newAddress);
      refetch();
    } catch (error: any) {
      console.error('Error updating address:', error);
      toast({
        title: 'Error updating address',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Download and archive brochure from listing
  const handleDownloadBrochure = async (listingId: string, listingDbId: string, brochureUrl: string) => {
    if (!property) return;
    
    setDownloadingBrochure(listingId);
    try {
      const { data, error } = await supabase.functions.invoke('download-brochure', {
        body: { 
          propertyId: property.id, 
          marketListingId: listingDbId,
          listingId,
          brochureUrl 
        }
      });

      if (error) throw error;

      // Check for application-level errors (function returns 200 but with error status)
      if (data?.status && data.status !== 'success') {
        const errorMessages: Record<string, string> = {
          'restricted': 'Access restricted - this brochure cannot be downloaded automatically',
          'file_too_large': data.error || 'File is too large to archive',
          'invalid_url': 'Invalid brochure URL',
          'dns_error': 'Could not reach the brochure server',
          'not_found': 'Brochure file not found (404)',
        };
        throw new Error(errorMessages[data.status] || data.error || 'Download failed');
      }

      toast({ title: 'Brochure archived successfully' });
      refetch();
    } catch (error: any) {
      console.error('Error downloading brochure:', error);
      toast({
        title: 'Error archiving brochure',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setDownloadingBrochure(null);
    }
  };

  // Download all brochures at once
  const handleDownloadAllBrochures = async () => {
    if (!property || !property.linked_listings) return;
    
    const listingsWithBrochures = property.linked_listings.filter(l => l.link);
    if (listingsWithBrochures.length === 0) {
      toast({
        title: 'No brochures to save',
        description: 'None of the linked listings have brochure links.',
        variant: 'destructive'
      });
      return;
    }
    
    setDownloadingAllBrochures(true);
    let saved = 0;
    let failed = 0;
    
    for (const listing of listingsWithBrochures) {
      try {
        const { data, error } = await supabase.functions.invoke('download-brochure', {
          body: { 
            propertyId: property.id, 
            marketListingId: listing.id,
            listingId: listing.listing_id,
            brochureUrl: listing.link!
          }
        });
        
        if (error) {
          console.error(`Failed to save brochure for ${listing.listing_id}:`, error);
          failed++;
        } else if (data?.status && data.status !== 'success') {
          // Application-level error (restricted, file too large, etc.)
          console.error(`Failed to save brochure for ${listing.listing_id}:`, data.error || data.status);
          failed++;
        } else {
          saved++;
        }
      } catch (err) {
        console.error(`Error saving brochure for ${listing.listing_id}:`, err);
        failed++;
      }
    }
    
    setDownloadingAllBrochures(false);
    refetch();
    
    toast({
      title: 'Bulk save complete',
      description: `Saved ${saved} brochure${saved !== 1 ? 's' : ''}${failed > 0 ? `, ${failed} failed` : ''}`
    });
  };

  // Manual upload brochure
  const handleUploadBrochure = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !property) return;

    // Validate file type
    if (!file.type.includes('pdf')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF file',
        variant: 'destructive'
      });
      return;
    }

    // Check file size (15MB limit)
    if (file.size > 15 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 15MB',
        variant: 'destructive'
      });
      return;
    }

    setUploadingBrochure(true);
    try {
      // Generate filename based on property address
      const sanitizedAddress = (property.display_address || property.address)
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);
      const date = new Date().toISOString().split('T')[0];
      
      // Find next version number
      const existingVersions = brochures
        .filter(b => b.storage_path.includes(sanitizedAddress))
        .map(b => {
          const match = b.storage_path.match(/-v(\d+)\.pdf$/);
          return match ? parseInt(match[1], 10) : 0;
        });
      const nextVersion = existingVersions.length > 0 ? Math.max(...existingVersions) + 1 : 1;
      
      const filename = `${property.id}/${sanitizedAddress}-${date}-v${nextVersion}.pdf`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('property-brochures')
        .upload(filename, file, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Create database record
      const { error: dbError } = await supabase
        .from('property_brochures')
        .insert({
          property_id: property.id,
          original_url: 'manual-upload',
          storage_path: filename,
          file_size: file.size,
          download_method: 'manual',
          notes: `Manually uploaded: ${file.name}`
        });

      if (dbError) throw dbError;

      toast({ title: 'Brochure uploaded successfully' });
      refetch();
    } catch (error: any) {
      console.error('Error uploading brochure:', error);
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUploadingBrochure(false);
      // Reset input
      event.target.value = '';
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    if (!Number.isFinite(value)) return '-';
    return new Intl.NumberFormat('en-CA', { 
      style: 'currency', 
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatSF = (sf: number | null) => {
    if (!sf) return '-';
    return sf.toLocaleString() + ' SF';
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!property) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8">
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Property Not Found</h2>
            <p className="text-muted-foreground mb-4">The property you're looking for doesn't exist.</p>
            <Button onClick={() => navigate('/properties')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Properties
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/properties')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-black tracking-tight">
                {property.name || property.address}
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {property.display_address || property.address}, {property.city}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setPinDialogOpen(true)}
              className={property.geocode_source === 'manual' ? 'border-orange-500' : ''}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Edit Pin
            </Button>
            <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatSF(property.size_sf)}</p>
                  <p className="text-xs text-muted-foreground">Building Size</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{property.year_built || '-'}</p>
                  <p className="text-xs text-muted-foreground">Year Built</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <LinkIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{property.active_listing_count || 0}</p>
                  <p className="text-xs text-muted-foreground">Active Listings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Archive className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{brochures.length}</p>
                  <p className="text-xs text-muted-foreground">Archived Brochures</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="h-auto flex-wrap justify-start">
            <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs px-2 py-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="tenants" className="flex items-center gap-1.5 text-xs px-2 py-1.5">
              <Users className="h-3.5 w-3.5" />
              Tenants ({tenants.length})
            </TabsTrigger>
            <TabsTrigger value="listings" className="flex items-center gap-1.5 text-xs px-2 py-1.5">
              <LinkIcon className="h-3.5 w-3.5" />
              Listings
            </TabsTrigger>
            <TabsTrigger value="brochures" className="flex items-center gap-1.5 text-xs px-2 py-1.5">
              <Archive className="h-3.5 w-3.5" />
              Brochures
            </TabsTrigger>
            <TabsTrigger value="city-data" className="flex items-center gap-1.5 text-xs px-2 py-1.5">
              <ClipboardList className="h-3.5 w-3.5" />
              City Data
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-1.5 text-xs px-2 py-1.5">
              <Receipt className="h-3.5 w-3.5" />
              Transactions ({transactions.length})
            </TabsTrigger>
            <TabsTrigger value="photos" className="flex items-center gap-1.5 text-xs px-2 py-1.5">
              <Image className="h-3.5 w-3.5" />
              Photos
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Property Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Property Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Property Type</p>
                      <p className="font-medium">{property.property_type || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Building Class</p>
                      <p className="font-medium">{property.building_class ? `Class ${property.building_class}` : '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Submarket</p>
                      <p className="font-medium">{formatSubmarket(property.submarket)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Zoning</p>
                      <p className="font-medium">{property.zoning || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Land Area</p>
                      <p className="font-medium">{property.land_acres ? `${Number(property.land_acres).toFixed(2)} acres` : '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Clear Height</p>
                      <p className="font-medium">{property.clear_height_ft ? `${property.clear_height_ft} ft` : '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Dock Doors</p>
                      <p className="font-medium">{property.dock_doors || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Drive-In Doors</p>
                      <p className="font-medium">{property.drive_in_doors || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Assessment & Tax */}
              <Card>
                <CardHeader>
                  <CardTitle>Assessment & Tax</CardTitle>
                  <CardDescription>
                    {property.city_data_fetched_at 
                      ? `Last updated: ${format(new Date(property.city_data_fetched_at), 'MMM d, yyyy')}`
                      : 'No city data fetched yet'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Roll Number</p>
                      <p className="font-medium font-mono">{property.roll_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tax Class</p>
                      <p className="font-medium">{property.tax_class || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        Total Assessed Value
                        {(property.city_data_raw as any)?.assessment?.roll_year && (
                          <span className="ml-1">({(property.city_data_raw as any).assessment.roll_year})</span>
                        )}
                      </p>
                      <p className="font-medium text-lg">{formatCurrency(property.assessed_value)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Est. Annual Tax</p>
                      <p className="font-medium text-lg">
                        {property.assessed_value 
                          ? formatCurrency(property.assessed_value * millRate)
                          : '-'
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">{millRateYear} mill rate: {(millRate * 100).toFixed(2)}%</p>
                    </div>
                  </div>
                  {property.legal_description && (
                    <>
                      <Separator />
                      <div className="text-sm">
                        <p className="text-muted-foreground">Legal Description</p>
                        <p className="font-medium font-mono text-xs">{property.legal_description}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              {(property.notes || property.internal_notes) && (
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {property.notes && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Public Notes</p>
                        <p className="text-sm whitespace-pre-wrap">{property.notes}</p>
                      </div>
                    )}
                    {property.internal_notes && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Internal Notes</p>
                        <p className="text-sm whitespace-pre-wrap">{property.internal_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Tenants Tab */}
          <TabsContent value="tenants" className="space-y-4">
            <TenantsSection 
              propertyId={property.id} 
              propertyName={property.name || property.address} 
            />
          </TabsContent>

          {/* Listings Tab */}
          <TabsContent value="listings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Linked Listings</CardTitle>
                <CardDescription>
                  Market listings associated with this property
                </CardDescription>
              </CardHeader>
              <CardContent>
                {property.linked_listings && property.linked_listings.length > 0 ? (
                  <div className="space-y-3">
                    {property.linked_listings.map(listing => (
                      <div 
                        key={listing.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <Badge variant={listing.status === 'Active' ? 'default' : 'secondary'}>
                            {listing.status}
                          </Badge>
                          <div>
                            <p className="font-medium font-mono">{listing.listing_id}</p>
                            <p className="text-sm text-muted-foreground">{listing.address}</p>
                          </div>
                          <p className="text-sm font-mono">{listing.size_sf?.toLocaleString()} SF</p>
                          {listing.link_type === 'auto' && (
                            <Badge variant="outline" className="text-xs">Auto-linked</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {(listing.brochure_link || listing.link) && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open((listing.brochure_link || listing.link)!, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                View Brochure
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleDownloadBrochure(listing.listing_id, listing.id, (listing.brochure_link || listing.link)!)}
                                disabled={downloadingBrochure === listing.listing_id}
                              >
                                {downloadingBrochure === listing.listing_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Download className="h-4 w-4 mr-1" />
                                    Save Brochure
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/market-listings?search=${encodeURIComponent(listing.listing_id)}`)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <LinkIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No listings linked to this property yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Brochures Tab */}
          <TabsContent value="brochures" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Brochure Archive</CardTitle>
                  <CardDescription>
                    Historical brochures downloaded from listings over time
                  </CardDescription>
                </div>
                <div>
                  <input
                    type="file"
                    id="brochure-upload"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={handleUploadBrochure}
                    disabled={uploadingBrochure}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('brochure-upload')?.click()}
                    disabled={uploadingBrochure}
                  >
                    {uploadingBrochure ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {brochures.length > 0 ? (
                  <div className="space-y-3">
                    {brochures.map(brochure => (
                      <div 
                        key={brochure.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-red-500/10 rounded-lg">
                            <FileText className="h-5 w-5 text-red-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {brochure.storage_path 
                                  ? brochure.storage_path.split('/').pop()?.replace('.pdf', '') || 'Unknown'
                                  : 'Unknown'}
                              </p>
                              {brochure.download_method === 'firecrawl' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                  Firecrawl
                                </span>
                              )}
                              {brochure.download_method === 'direct' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                  Direct
                                </span>
                              )}
                              {brochure.download_method === 'manual' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                  Manual Upload
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Downloaded {format(new Date(brochure.downloaded_at), 'MMM d, yyyy h:mm a')}
                            </p>
                            {brochure.file_size && (
                              <p className="text-xs text-muted-foreground">
                                {(brochure.file_size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const { data, error } = await supabase.storage
                                .from('property-brochures')
                                .createSignedUrl(brochure.storage_path, 3600);
                              if (data?.signedUrl) {
                                window.open(data.signedUrl, '_blank');
                              }
                            }}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Archive className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No brochures archived yet.</p>
                    <p className="text-sm">Archive brochures from the Listings tab to maintain a historical record.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* City Data Tab */}
          <TabsContent value="city-data" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">City of Calgary Data</h3>
                <p className="text-sm text-muted-foreground">
                  Assessment, zoning, and permit information from City of Calgary Open Data
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleOpenMyProperty}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on My Property
                </Button>
                <Button 
                  onClick={() => handleFetchCityData()}
                  disabled={fetchingCityData}
                >
                  {fetchingCityData ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {property.city_data_fetched_at ? 'Refresh City Data' : 'Fetch City Data'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Zoning & Land Use */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    Zoning & Land Use
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Land Use Designation</p>
                      <p className="font-medium">{property.land_use_designation || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Community</p>
                      <p className="font-medium">{property.community_name || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Permits */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardHat className="h-5 w-5" />
                    Building & Development Permits
                  </CardTitle>
                  <CardDescription>
                    {permits.length} permit{permits.length !== 1 ? 's' : ''} found
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {permits.length > 0 ? (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {permits.map(permit => (
                        <div key={permit.id} className="p-3 border rounded-lg text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono font-medium">{permit.permit_number}</span>
                            <Badge variant={permit.status === 'Complete' ? 'default' : 'secondary'}>
                              {permit.status || 'Unknown'}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">{permit.description || permit.permit_class}</p>
                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Type: {permit.permit_type}</span>
                            {permit.issued_date && (
                              <span>Issued: {format(new Date(permit.issued_date), 'MMM d, yyyy')}</span>
                            )}
                            {permit.estimated_value && (
                              <span>Value: {formatCurrency(permit.estimated_value)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No permits found. Click "Fetch City Data" to retrieve permit information.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>
                  All transactions recorded for this property
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length > 0 ? (
                  <div className="space-y-3">
                    {transactions.map(tx => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/transactions/${tx.id}`)}
                      >
                        <div className="flex items-center gap-4">
                          <Badge variant={tx.transaction_type === 'Sale' ? 'default' : 'secondary'}>
                            {tx.transaction_type}
                          </Badge>
                          <div>
                            <p className="font-medium">
                              {tx.transaction_type === 'Unknown/Removed'
                                ? (tx.listing_removal_date
                                    ? format(new Date(tx.listing_removal_date), 'MMM d, yyyy')
                                    : 'Date pending')
                                : (tx.transaction_date
                                    ? format(new Date(tx.transaction_date), 'MMM d, yyyy')
                                    : 'Date pending')
                              }
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {tx.size_sf?.toLocaleString()} SF
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {tx.transaction_type === 'Sale' && tx.sale_price ? (
                            <p className="font-medium">{formatCurrency(tx.sale_price)}</p>
                          ) : tx.lease_rate_psf ? (
                            <p className="font-medium">${Number(tx.lease_rate_psf).toFixed(2)}/SF</p>
                          ) : null}
                          {tx.buyer_tenant_company && (
                            <p className="text-sm text-muted-foreground">{tx.buyer_tenant_company}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No transactions recorded for this property yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

           {/* Photos Tab */}
          <TabsContent value="photos" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Property Photos</CardTitle>
                <label>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0 || !property) return;
                      
                      let uploaded = 0;
                      for (const file of Array.from(files)) {
                        if (file.size > 10 * 1024 * 1024) {
                          toast({ title: 'File too large', description: `${file.name} exceeds 10MB`, variant: 'destructive' });
                          continue;
                        }
                        try {
                          const fileExt = file.name.split('.').pop();
                          const fileName = `${property.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
                          const { error: uploadError } = await supabase.storage
                            .from('property-photos')
                            .upload(fileName, file, { upsert: true });
                          if (uploadError) throw uploadError;
                          
                          const { data: { publicUrl } } = supabase.storage
                            .from('property-photos')
                            .getPublicUrl(fileName);
                          
                          const maxSort = (property.photos || []).reduce((max, p) => Math.max(max, p.sort_order), 0) + uploaded;
                          const { error: dbError } = await supabase
                            .from('property_photos')
                            .insert({
                              property_id: property.id,
                              photo_url: publicUrl,
                              sort_order: maxSort + 1,
                            });
                          if (dbError) throw dbError;
                          uploaded++;
                        } catch (err: any) {
                          console.error('Photo upload error:', err);
                          toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
                        }
                      }
                      if (uploaded > 0) {
                        toast({ title: `${uploaded} photo${uploaded > 1 ? 's' : ''} uploaded` });
                        refetch();
                      }
                      e.target.value = '';
                    }}
                  />
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Photos
                    </span>
                  </Button>
                </label>
              </CardHeader>
              <CardContent>
                {property.photos && property.photos.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {property.photos.map((photo, index) => (
                      <div key={photo.id} className="relative group">
                        <img
                          src={photo.photo_url}
                          alt={photo.caption || `Property photo ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(photo.photo_url, '_blank')}
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={async () => {
                            try {
                              const { error } = await supabase
                                .from('property_photos')
                                .delete()
                                .eq('id', photo.id);
                              if (error) throw error;
                              toast({ title: 'Photo deleted' });
                              refetch();
                            } catch (err: any) {
                              toast({ title: 'Error', description: err.message, variant: 'destructive' });
                            }
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        {photo.caption && (
                          <p className="text-xs text-muted-foreground mt-1">{photo.caption}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No photos uploaded yet. Click "Upload Photos" to add images.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <PropertyEditDialog
          property={property}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={handleSaveProperty}
          mode="edit"
        />

        {/* City Data Not Found Dialog */}
        <CityDataNotFoundDialog
          open={cityDataNotFoundOpen}
          onOpenChange={setCityDataNotFoundOpen}
          address={property.address}
          city={property.city}
          propertyId={property.id}
          latitude={property.latitude}
          longitude={property.longitude}
          onRetryWithAddress={handleRetryWithAddress}
          onOpenParcelPicker={() => setParcelPickerOpen(true)}
        />

        {/* City Parcel Picker Dialog */}
        <CityParcelPickerDialog
          open={parcelPickerOpen}
          onOpenChange={setParcelPickerOpen}
          address={property.address}
          city={property.city}
          latitude={property.latitude}
          longitude={property.longitude}
          onSelectParcel={handleRetryWithAddress}
        />

        {/* Edit Pin Location Dialog */}
        <EditPropertyPinDialog
          property={property}
          open={pinDialogOpen}
          onOpenChange={setPinDialogOpen}
          onSave={refetch}
        />
      </div>
    </AppLayout>
  );
}
