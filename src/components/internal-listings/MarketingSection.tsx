 import { useState, useCallback, useEffect } from 'react';
 import { pdf } from '@react-pdf/renderer';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Checkbox } from '@/components/ui/checkbox';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { Input } from '@/components/ui/input';
 import { Skeleton } from '@/components/ui/skeleton';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import { AspectRatio } from '@/components/ui/aspect-ratio';
 import {
   Sparkles,
   FileText,
   Download,
   RefreshCw,
   Pencil,
   Save,
   X,
  Upload,
  Image as ImageIcon,
  Trash2,
  MapPin,
 } from 'lucide-react';
 import { ListingBrochurePDF, MarketingContent } from './ListingBrochurePDF';
 
 interface MarketingSectionProps {
   listing: {
     id: string;
     address: string;
     display_address?: string | null;
     city: string;
     submarket: string;
     deal_type: string;
     size_sf: number | null;
     warehouse_sf: number | null;
     office_sf: number | null;
     land_acres: number | null;
     clear_height_ft: number | null;
     dock_doors: number | null;
     drive_in_doors: number | null;
     asking_rent_psf: number | null;
     asking_sale_price: number | null;
     property_type: string | null;
     power: string | null;
     yard: string | null;
     zoning: string | null;
     description: string | null;
     broker_remarks: string | null;
     loading_type: string | null;
     cam: number | null;
     op_costs: number | null;
     taxes: number | null;
     gross_rate: number | null;
     listing_number: string | null;
      latitude: number | null;
      longitude: number | null;
      photo_url: string | null;
   };
    onPhotoUpdate?: (photoUrl: string | null) => void;
 }
 
export function MarketingSection({ listing, onPhotoUpdate }: MarketingSectionProps) {
   const [isGenerating, setIsGenerating] = useState(false);
   const [marketingContent, setMarketingContent] = useState<MarketingContent | null>(null);
   const [isEditing, setIsEditing] = useState(false);
   const [editedContent, setEditedContent] = useState<MarketingContent | null>(null);
   const [includeConfidential, setIncludeConfidential] = useState(false);
   const [isDownloading, setIsDownloading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(listing.photo_url);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number | null; lng: number | null }>({
    lat: listing.latitude,
    lng: listing.longitude,
  });
  const [googleMapsKey, setGoogleMapsKey] = useState<string | null>(null);
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Sync coordinates when listing prop changes (e.g., after parent refetch)
  useEffect(() => {
    setCoordinates({
      lat: listing.latitude,
      lng: listing.longitude,
    });
  }, [listing.latitude, listing.longitude]);

  // Fetch Google Maps API key for map preview - refetch when coordinates change or if key is missing
  const fetchMapsKey = useCallback(async () => {
    try {
      const { data: tokenData } = await supabase.functions.invoke('get-google-maps-token', {
        body: { authenticated: true }
      });
      if (tokenData?.apiKey) {
        setGoogleMapsKey(tokenData.apiKey);
        return true;
      }
    } catch (error) {
      console.warn('Could not fetch maps key for preview:', error);
    }
    return false;
  }, []);

  useEffect(() => {
    // Fetch key on mount and when coordinates are set (e.g., after geocoding)
    if (!googleMapsKey) {
      fetchMapsKey();
    }
  }, [googleMapsKey, fetchMapsKey, coordinates.lat, coordinates.lng]);

  // Fetch map image via proxy when we have coordinates
  useEffect(() => {
    const fetchMapImage = async () => {
      if (!coordinates.lat || !coordinates.lng) {
        setMapImageUrl(null);
        return;
      }

      setMapLoading(true);
      setMapError(null);

      try {
        // Use proxy endpoint to avoid referrer restrictions
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session?.access_token) {
          throw new Error('Not authenticated');
        }

        const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-static-map?lat=${coordinates.lat}&lng=${coordinates.lng}&zoom=14&size=800x450&scale=2&maptype=roadmap`;
        
        const response = await fetch(proxyUrl, {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to load map');
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        // Clean up previous blob URL
        if (mapImageUrl) {
          URL.revokeObjectURL(mapImageUrl);
        }
        
        setMapImageUrl(blobUrl);
      } catch (error) {
        console.error('Failed to load map image:', error);
        setMapError(error instanceof Error ? error.message : 'Failed to load map');
      } finally {
        setMapLoading(false);
      }
    };

    fetchMapImage();

    // Cleanup on unmount
    return () => {
      if (mapImageUrl) {
        URL.revokeObjectURL(mapImageUrl);
      }
    };
  }, [coordinates.lat, coordinates.lng]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${listing.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('internal-listing-photos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('internal-listing-photos')
        .getPublicUrl(fileName);

      // Update the listing record
      const { error: updateError } = await supabase
        .from('internal_listings')
        .update({ photo_url: publicUrl })
        .eq('id', listing.id);

      if (updateError) throw updateError;

      setPhotoUrl(publicUrl);
      onPhotoUpdate?.(publicUrl);
      toast.success('Photo uploaded successfully');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  }, [listing.id, onPhotoUpdate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleRemovePhoto = async () => {
    try {
      const { error } = await supabase
        .from('internal_listings')
        .update({ photo_url: null })
        .eq('id', listing.id);

      if (error) throw error;

      setPhotoUrl(null);
      onPhotoUpdate?.(null);
      toast.success('Photo removed');
    } catch (error) {
      console.error('Error removing photo:', error);
      toast.error('Failed to remove photo');
    }
  };
 
  const handleGeocode = async () => {
    setIsGeocoding(true);
    try {
      // Get Google Maps API key
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('get-google-maps-token', {
        body: { authenticated: true }
      });

      if (tokenError || !tokenData?.apiKey) {
        throw new Error('Failed to get map token');
      }

      // Geocode the address
      const address = `${listing.address}, ${listing.city}, AB, Canada`;
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${tokenData.apiKey}`;
      
      const response = await fetch(geocodeUrl);
      const data = await response.json();

      if (data.status !== 'OK' || !data.results?.[0]) {
        throw new Error('Address not found');
      }

      const location = data.results[0].geometry.location;
      
      // Update the listing
      const { error: updateError } = await supabase
        .from('internal_listings')
        .update({
          latitude: location.lat,
          longitude: location.lng,
        })
        .eq('id', listing.id);

      if (updateError) throw updateError;

      setCoordinates({ lat: location.lat, lng: location.lng });
      onPhotoUpdate?.(photoUrl); // Trigger refetch
      toast.success('Location geocoded successfully');
    } catch (error) {
      console.error('Error geocoding:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to geocode address');
    } finally {
      setIsGeocoding(false);
    }
  };

   const generateMarketingContent = async () => {
     setIsGenerating(true);
     try {
       const { data, error } = await supabase.functions.invoke('generate-listing-marketing', {
         body: { listing }
       });
 
       if (error) throw error;
       if (data.error) throw new Error(data.error);
 
       setMarketingContent(data);
       setEditedContent(data);
       toast.success('Marketing content generated!');
     } catch (error) {
       console.error('Error generating marketing:', error);
       toast.error(error instanceof Error ? error.message : 'Failed to generate marketing content');
     } finally {
       setIsGenerating(false);
     }
   };
 
   const handleSaveEdits = () => {
     if (editedContent) {
       setMarketingContent(editedContent);
       setIsEditing(false);
       toast.success('Changes saved');
     }
   };
 
   const handleCancelEdit = () => {
     setEditedContent(marketingContent);
     setIsEditing(false);
   };
 
   const downloadPDF = async () => {
     if (!marketingContent) return;
     
     setIsDownloading(true);
     try {
      // Get Google Maps API key for static map
      let staticMapUrl: string | undefined;
      if (coordinates.lat && coordinates.lng) {
        try {
          const { data: tokenData } = await supabase.functions.invoke('get-google-maps-token', {
            body: { authenticated: true }
          });
          if (tokenData?.apiKey) {
            staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${coordinates.lat},${coordinates.lng}&zoom=14&size=800x450&scale=2&maptype=roadmap&markers=color:red%7C${coordinates.lat},${coordinates.lng}&key=${tokenData.apiKey}`;
          }
        } catch (mapError) {
          console.warn('Could not fetch map token:', mapError);
        }
      }

      // Use current photoUrl state (which may have been updated via upload)
      const listingWithPhoto = {
        ...listing,
        photo_url: photoUrl,
        latitude: coordinates.lat,
        longitude: coordinates.lng,
      };

       const doc = (
         <ListingBrochurePDF 
          listing={listingWithPhoto} 
           marketing={marketingContent}
           includeConfidential={includeConfidential}
          staticMapUrl={staticMapUrl}
         />
       );
       
       const blob = await pdf(doc).toBlob();
       const url = URL.createObjectURL(blob);
       const link = document.createElement('a');
       link.href = url;
       link.download = `${listing.address.replace(/[^a-zA-Z0-9]/g, '-')}-Brochure.pdf`;
       link.click();
       URL.revokeObjectURL(url);
       toast.success('PDF downloaded!');
     } catch (error) {
       console.error('Error generating PDF:', error);
       toast.error('Failed to generate PDF');
     } finally {
       setIsDownloading(false);
     }
   };
 
   const downloadIDML = () => {
     if (!marketingContent) return;
     
     // Generate IDML-ready content as JSON
     const idmlContent = {
       metadata: {
         version: '1.0',
         generated: new Date().toISOString(),
         listing_id: listing.id,
         listing_number: listing.listing_number,
       },
        assets: {
          photo_url: photoUrl,
          latitude: listing.latitude,
          longitude: listing.longitude,
        },
       content: {
         headline: marketingContent.headline,
         tagline: marketingContent.tagline,
         address: listing.display_address || listing.address,
         city: listing.city,
         submarket: listing.submarket,
         deal_type: listing.deal_type,
         description: marketingContent.description,
         highlights: marketingContent.highlights,
         broker_pitch: includeConfidential ? marketingContent.broker_pitch : null,
       },
       specifications: {
         size_sf: listing.size_sf,
         warehouse_sf: listing.warehouse_sf,
         office_sf: listing.office_sf,
         land_acres: listing.land_acres,
         clear_height_ft: listing.clear_height_ft,
         dock_doors: listing.dock_doors,
         drive_in_doors: listing.drive_in_doors,
         loading_type: listing.loading_type,
         power: listing.power,
         yard: listing.yard,
         zoning: listing.zoning,
         property_type: listing.property_type,
       },
       financials: {
         asking_rent_psf: listing.asking_rent_psf,
         asking_sale_price: listing.asking_sale_price,
         cam: listing.cam,
         op_costs: listing.op_costs,
         taxes: listing.taxes,
         gross_rate: listing.gross_rate,
       }
     };
 
     const blob = new Blob([JSON.stringify(idmlContent, null, 2)], { type: 'application/json' });
     const url = URL.createObjectURL(blob);
     const link = document.createElement('a');
     link.href = url;
     link.download = `${listing.address.replace(/[^a-zA-Z0-9]/g, '-')}-IDML-Data.json`;
     link.click();
     URL.revokeObjectURL(url);
     toast.success('IDML data exported! Import into InDesign via Data Merge.');
   };
 
  const hasLocation = coordinates.lat && coordinates.lng;

   return (
     <div className="space-y-6">
      {/* Photo Upload Section */}
      <Card className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Brochure Photo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {photoUrl ? (
            <div className="space-y-4">
              <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-lg border">
                <img
                  src={photoUrl}
                  alt="Listing photo"
                  className="object-cover w-full h-full"
                />
              </AspectRatio>
              <div className="flex gap-2">
                <div {...getRootProps()} className="flex-1">
                  <input {...getInputProps()} />
                  <Button variant="outline" className="w-full" disabled={isUploadingPhoto}>
                    {isUploadingPhoto ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Replace Photo
                  </Button>
                </div>
                <Button variant="outline" onClick={handleRemovePhoto}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              {isUploadingPhoto ? (
                <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
              ) : (
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              )}
              <p className="text-sm text-muted-foreground">
                {isDragActive ? 'Drop image here...' : 'Drag & drop a photo, or click to select'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, or WebP up to 10MB
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location Map Preview */}
      <Card className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Location Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasLocation ? (
            <div className="space-y-2">
              <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-lg border bg-muted">
                {mapLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : mapError ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MapPin className="h-6 w-6 mb-2" />
                    <p className="text-xs">{mapError}</p>
                  </div>
                ) : mapImageUrl ? (
                  <img
                    src={mapImageUrl}
                    alt="Location map"
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
              </AspectRatio>
              <p className="text-xs text-muted-foreground text-center">
                Map will be included in PDF brochure
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <MapPin className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-1">No location coordinates available</p>
              <p className="text-xs text-muted-foreground mb-4">Geocode the listing to include a map in the brochure</p>
              <Button 
                variant="outline" 
                onClick={handleGeocode}
                disabled={isGeocoding}
              >
                {isGeocoding ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4 mr-2" />
                )}
                Geocode Address
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

       {/* Generate Button */}
       {!marketingContent && !isGenerating && (
         <Card className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
           <CardContent className="py-12 text-center">
             <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary" />
             <h3 className="text-lg font-semibold mb-2">AI-Powered Marketing</h3>
             <p className="text-muted-foreground mb-6 max-w-md mx-auto">
               Generate professional marketing copy including headlines, descriptions, and key highlights using AI.
             </p>
             <Button onClick={generateMarketingContent} size="lg">
               <Sparkles className="h-4 w-4 mr-2" />
               Generate Marketing Content
             </Button>
           </CardContent>
         </Card>
       )}
 
       {/* Loading State */}
       {isGenerating && (
         <Card className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
           <CardContent className="py-12">
             <div className="flex flex-col items-center gap-4">
               <RefreshCw className="h-8 w-8 animate-spin text-primary" />
               <p className="text-muted-foreground">Generating marketing content...</p>
               <div className="space-y-3 w-full max-w-md">
                 <Skeleton className="h-6 w-3/4" />
                 <Skeleton className="h-4 w-full" />
                 <Skeleton className="h-4 w-full" />
                 <Skeleton className="h-4 w-2/3" />
               </div>
             </div>
           </CardContent>
         </Card>
       )}
 
       {/* Generated Content */}
       {marketingContent && !isGenerating && (
         <>
           {/* Actions Bar */}
           <Card className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
             <CardContent className="py-4">
               <div className="flex flex-wrap items-center justify-between gap-4">
                 <div className="flex items-center gap-4">
                   <div className="flex items-center space-x-2">
                     <Checkbox
                       id="confidential"
                       checked={includeConfidential}
                       onCheckedChange={(checked) => setIncludeConfidential(checked as boolean)}
                     />
                     <Label htmlFor="confidential" className="text-sm">
                       Include broker notes
                     </Label>
                   </div>
                 </div>
                 <div className="flex items-center gap-2">
                   <Button
                     variant="outline"
                     onClick={generateMarketingContent}
                     disabled={isGenerating}
                   >
                     <RefreshCw className="h-4 w-4 mr-2" />
                     Regenerate
                   </Button>
                   {!isEditing ? (
                     <Button variant="outline" onClick={() => setIsEditing(true)}>
                       <Pencil className="h-4 w-4 mr-2" />
                       Edit
                     </Button>
                   ) : (
                     <>
                       <Button variant="outline" onClick={handleCancelEdit}>
                         <X className="h-4 w-4 mr-2" />
                         Cancel
                       </Button>
                       <Button onClick={handleSaveEdits}>
                         <Save className="h-4 w-4 mr-2" />
                         Save
                       </Button>
                     </>
                   )}
                 </div>
               </div>
             </CardContent>
           </Card>
 
           {/* Content Preview / Edit */}
           <div className="grid md:grid-cols-2 gap-6">
             {/* Headline & Tagline */}
             <Card className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
               <CardHeader>
                 <CardTitle className="text-base">Headline & Tagline</CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                 {isEditing && editedContent ? (
                   <>
                     <div>
                       <Label className="text-xs text-muted-foreground">Headline</Label>
                       <Input
                         value={editedContent.headline}
                         onChange={(e) => setEditedContent({ ...editedContent, headline: e.target.value })}
                       />
                     </div>
                     <div>
                       <Label className="text-xs text-muted-foreground">Tagline</Label>
                       <Input
                         value={editedContent.tagline}
                         onChange={(e) => setEditedContent({ ...editedContent, tagline: e.target.value })}
                       />
                     </div>
                   </>
                 ) : (
                   <>
                     <div>
                       <p className="text-xs text-muted-foreground mb-1">Headline</p>
                       <p className="text-lg font-semibold">{marketingContent.headline}</p>
                     </div>
                     <div>
                       <p className="text-xs text-muted-foreground mb-1">Tagline</p>
                       <p className="text-primary">{marketingContent.tagline}</p>
                     </div>
                   </>
                 )}
               </CardContent>
             </Card>
 
             {/* Key Highlights */}
             <Card className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
               <CardHeader>
                 <CardTitle className="text-base">Key Highlights</CardTitle>
               </CardHeader>
               <CardContent>
                 {isEditing && editedContent ? (
                   <Textarea
                     value={editedContent.highlights.join('\n')}
                     onChange={(e) => setEditedContent({
                       ...editedContent,
                       highlights: e.target.value.split('\n').filter(h => h.trim())
                     })}
                     rows={6}
                     placeholder="One highlight per line"
                   />
                 ) : (
                   <ul className="space-y-2">
                     {marketingContent.highlights.map((highlight, idx) => (
                       <li key={idx} className="flex items-start gap-2">
                         <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                         <span className="text-sm">{highlight}</span>
                       </li>
                     ))}
                   </ul>
                 )}
               </CardContent>
             </Card>
           </div>
 
           {/* Description */}
           <Card className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
             <CardHeader>
               <CardTitle className="text-base">Property Description</CardTitle>
             </CardHeader>
             <CardContent>
               {isEditing && editedContent ? (
                 <Textarea
                   value={editedContent.description}
                   onChange={(e) => setEditedContent({ ...editedContent, description: e.target.value })}
                   rows={6}
                 />
               ) : (
                 <p className="text-sm leading-relaxed whitespace-pre-line">
                   {marketingContent.description}
                 </p>
               )}
             </CardContent>
           </Card>
 
           {/* Broker Pitch */}
           <Card className="border-2 border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/20 shadow-[4px_4px_0_hsl(var(--foreground))]">
             <CardHeader>
               <CardTitle className="text-base flex items-center gap-2">
                 <span className="text-amber-600 dark:text-amber-400">Confidential</span>
                 Broker Notes
               </CardTitle>
             </CardHeader>
             <CardContent>
               {isEditing && editedContent ? (
                 <Textarea
                   value={editedContent.broker_pitch}
                   onChange={(e) => setEditedContent({ ...editedContent, broker_pitch: e.target.value })}
                   rows={3}
                 />
               ) : (
                 <p className="text-sm leading-relaxed">{marketingContent.broker_pitch}</p>
               )}
             </CardContent>
           </Card>
 
           {/* Download Actions */}
           <Card className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
             <CardContent className="py-6">
               <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                 <Button
                   onClick={downloadPDF}
                   disabled={isDownloading}
                   size="lg"
                 >
                   {isDownloading ? (
                     <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                   ) : (
                     <FileText className="h-4 w-4 mr-2" />
                   )}
                   Download PDF Brochure
                 </Button>
                 <Button
                   variant="outline"
                   onClick={downloadIDML}
                   size="lg"
                 >
                   <Download className="h-4 w-4 mr-2" />
                   Export for InDesign
                 </Button>
               </div>
               <p className="text-xs text-muted-foreground text-center mt-3">
                 IDML export provides structured data for Adobe InDesign Data Merge
               </p>
             </CardContent>
           </Card>
         </>
       )}
     </div>
   );
 }