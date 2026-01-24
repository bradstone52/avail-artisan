import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { usePropertyDetail, PropertyBrochure, PropertyPermit } from '@/hooks/useProperties';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
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
  Archive
} from 'lucide-react';
import { format } from 'date-fns';

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { property, brochures, permits, loading, refetch } = usePropertyDetail(id);
  
  const [fetchingCityData, setFetchingCityData] = useState(false);
  const [downloadingBrochure, setDownloadingBrochure] = useState<string | null>(null);

  // Fetch City of Calgary data
  const handleFetchCityData = async () => {
    if (!property) return;
    
    setFetchingCityData(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-city-data', {
        body: { propertyId: property.id, address: property.address, city: property.city }
      });

      if (error) throw error;

      toast({ title: 'City data fetched successfully' });
      refetch();
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
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="listings" className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Listings
            </TabsTrigger>
            <TabsTrigger value="brochures" className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Brochures
            </TabsTrigger>
            <TabsTrigger value="city-data" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              City Data
            </TabsTrigger>
            <TabsTrigger value="photos" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
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
                      <p className="font-medium">{property.land_acres ? `${property.land_acres} acres` : '-'}</p>
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
                      <p className="text-muted-foreground">Total Assessed Value</p>
                      <p className="font-medium text-lg">{formatCurrency(property.assessed_value)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Est. Annual Tax</p>
                      <p className="font-medium text-lg">
                        {property.assessed_value 
                          ? formatCurrency(property.assessed_value * 0.02182860)
                          : '-'
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">2025 mill rate: 2.18%</p>
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
                          {listing.link && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(listing.link!, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                View Brochure
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleDownloadBrochure(listing.listing_id, listing.id, listing.link!)}
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
              <CardHeader>
                <CardTitle>Brochure Archive</CardTitle>
                <CardDescription>
                  Historical brochures downloaded from listings over time
                </CardDescription>
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
                            <p className="font-medium">
                              {brochure.listing_id || 'Unknown Listing'}
                            </p>
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
                            onClick={() => {
                              const { data } = supabase.storage
                                .from('property-brochures')
                                .getPublicUrl(brochure.storage_path);
                              window.open(data.publicUrl, '_blank');
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
              <Button 
                onClick={handleFetchCityData} 
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

          {/* Photos Tab */}
          <TabsContent value="photos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Property Photos</CardTitle>
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
                        {photo.caption && (
                          <p className="text-xs text-muted-foreground mt-1">{photo.caption}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No photos uploaded yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
