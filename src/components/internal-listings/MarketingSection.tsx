/**
 * MarketingSection.tsx  (Phase 2)
 *
 * Split layout:
 *  Left column  — BrochureEditorPanel (template, photos, copy overrides, visibility)
 *  Right column — photo upload, map preview, generate/download controls
 *
 * All brochure state is now persisted to `brochure_states` via useBrochureState →
 * useBrochurePersistence, with localStorage as a fallback/migration path.
 */
import { useState, useCallback, useEffect } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import {
  Sparkles, FileText, Download, RefreshCw,
  Upload, Image as ImageIcon, Trash2, MapPin, ZoomIn, ZoomOut,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RotateCcw,
  Plus, Images, Save,
} from 'lucide-react';

import { useInternalListingPhotos } from '@/hooks/useInternalListingPhotos';
import { useOrg } from '@/hooks/useOrg';
import { useBrochureState } from '@/hooks/useBrochureState';
import { useBrochurePersistence } from '@/hooks/useBrochurePersistence';
import { buildBrochureData } from '@/lib/brochures/buildBrochureData';
import { toCompatibleBase64, convertPhotosToBase64 } from '@/lib/brochures/brochureImageUtils';
import { BrochureEngine } from '@/components/brochures/BrochureEngine';
import { BrochureEditorPanel } from '@/components/brochures/BrochureEditorPanel';
import type { BrochureSourceListing } from '@/lib/brochures/brochureTypes';

// Re-export for backwards compatibility
export type { BrochureSourceListing as BrochureListingData };

interface MarketingSectionProps {
  listing: BrochureSourceListing & {
    description?: string | null;
    broker_remarks?: string | null;
  };
  onPhotoUpdate?: (photoUrl: string | null) => void;
}

export function MarketingSection({ listing, onPhotoUpdate }: MarketingSectionProps) {
  const { org } = useOrg();

  // ── Brochure state (persistence-backed) ─────────────────────────────────────
  const {
    marketing, isGenerating, generateMarketing,
    overrides, updateOverride, resetOverrides,
    isEditing, setIsEditing,
    includeConfidential, setIncludeConfidential,
    mapZoom, mapOffset, handleZoomIn, handleZoomOut, handlePan, handleResetMap,
    isDownloading, setIsDownloading,
    isSaving, saveState,
    isLoadingState,
  } = useBrochureState(listing);

  // Also grab persistence state directly for the editor panel
  const persistence = useBrochurePersistence(listing.id);

  // ── Photo state ─────────────────────────────────────────────────────────────
  const [photoUrl, setPhotoUrl] = useState<string | null>(listing.photo_url ?? null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingAdditional, setIsUploadingAdditional] = useState(false);
  const { photos: additionalPhotos, uploadPhoto, deletePhoto } = useInternalListingPhotos(listing.id);

  // ── Coordinate / map state ──────────────────────────────────────────────────
  const [coordinates, setCoordinates] = useState({
    lat: listing.latitude ?? null,
    lng: listing.longitude ?? null,
  });
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    setCoordinates({ lat: listing.latitude ?? null, lng: listing.longitude ?? null });
  }, [listing.latitude, listing.longitude]);

  // Fetch static map preview
  useEffect(() => {
    let active = true;
    const prev = mapImageUrl;

    const fetchMap = async () => {
      if (!coordinates.lat || !coordinates.lng) { setMapImageUrl(null); return; }
      setMapLoading(true);
      setMapError(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session?.access_token) throw new Error('Not authenticated');
        const adjLat = coordinates.lat + mapOffset.lat;
        const adjLng = coordinates.lng + mapOffset.lng;
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-static-map?lat=${adjLat}&lng=${adjLng}&markerLat=${coordinates.lat}&markerLng=${coordinates.lng}&zoom=${mapZoom}&size=800x450&scale=2&maptype=roadmap&_t=${Date.now()}`;
        const resp = await fetch(url, { headers: { Authorization: `Bearer ${sessionData.session.access_token}` } });
        if (!resp.ok) throw new Error('Failed to load map');
        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);
        if (active) {
          if (prev) URL.revokeObjectURL(prev);
          setMapImageUrl(blobUrl);
        } else {
          URL.revokeObjectURL(blobUrl);
        }
      } catch (err) {
        if (active) setMapError(err instanceof Error ? err.message : 'Failed to load map');
      } finally {
        if (active) setMapLoading(false);
      }
    };

    fetchMap();
    return () => {
      active = false;
      if (prev) URL.revokeObjectURL(prev);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinates.lat, coordinates.lng, mapZoom, mapOffset.lat, mapOffset.lng]);

  // ── Photo upload ─────────────────────────────────────────────────────────────
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `${listing.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('internal-listing-photos').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('internal-listing-photos').getPublicUrl(path);
      const { error: dbErr } = await supabase.from('internal_listings').update({ photo_url: publicUrl }).eq('id', listing.id);
      if (dbErr) throw dbErr;
      setPhotoUrl(publicUrl);
      onPhotoUpdate?.(publicUrl);
      toast.success('Photo uploaded');
    } catch {
      toast.error('Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  }, [listing.id, onPhotoUpdate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }, maxFiles: 1, maxSize: 10 * 1024 * 1024,
  });

  const handleRemovePhoto = async () => {
    const { error } = await supabase.from('internal_listings').update({ photo_url: null }).eq('id', listing.id);
    if (error) { toast.error('Failed to remove photo'); return; }
    setPhotoUrl(null);
    onPhotoUpdate?.(null);
    toast.success('Photo removed');
  };

  const onDropAdditional = useCallback(async (files: File[]) => {
    if (!org?.id) { toast.error('Organization not found'); return; }
    setIsUploadingAdditional(true);
    try { for (const f of files) await uploadPhoto.mutateAsync({ file: f, orgId: org.id }); }
    finally { setIsUploadingAdditional(false); }
  }, [org?.id, uploadPhoto]);

  const { getRootProps: getAddlRootProps, getInputProps: getAddlInputProps, isDragActive: isAddlDragActive } = useDropzone({
    onDrop: onDropAdditional, accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }, maxFiles: 10, maxSize: 10 * 1024 * 1024,
  });

  // ── Geocode ──────────────────────────────────────────────────────────────────
  const handleGeocode = async () => {
    setIsGeocoding(true);
    try {
      const { data: tokenData, error: tokenErr } = await supabase.functions.invoke('get-google-maps-token', { body: { authenticated: true } });
      if (tokenErr || !tokenData?.apiKey) throw new Error('Failed to get map token');
      const addr = `${listing.address}, ${listing.city}, AB, Canada`;
      const geoResp = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addr)}&key=${tokenData.apiKey}`);
      const geoData = await geoResp.json();
      if (geoData.status !== 'OK' || !geoData.results?.[0]) throw new Error('Address not found');
      const loc = geoData.results[0].geometry.location;
      const { error: dbErr } = await supabase.from('internal_listings').update({ latitude: loc.lat, longitude: loc.lng }).eq('id', listing.id);
      if (dbErr) throw dbErr;
      setCoordinates({ lat: loc.lat, lng: loc.lng });
      onPhotoUpdate?.(photoUrl);
      toast.success('Location geocoded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to geocode');
    } finally {
      setIsGeocoding(false);
    }
  };

  // ── PDF download ─────────────────────────────────────────────────────────────
  const downloadPDF = async () => {
    if (!marketing) return;
    setIsDownloading(true);
    try {
      // 1. Map as base64
      let staticMapBase64: string | null = null;
      if (coordinates.lat && coordinates.lng) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session?.access_token) {
            const adjLat = coordinates.lat + mapOffset.lat;
            const adjLng = coordinates.lng + mapOffset.lng;
            const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-static-map?lat=${adjLat}&lng=${adjLng}&markerLat=${coordinates.lat}&markerLng=${coordinates.lng}&zoom=${mapZoom}&size=800x450&scale=2&maptype=roadmap`;
            const resp = await fetch(proxyUrl, { headers: { Authorization: `Bearer ${sessionData.session.access_token}` } });
            if (resp.ok) {
              const blob = await resp.blob();
              staticMapBase64 = await new Promise<string>((res) => {
                const reader = new FileReader();
                reader.onloadend = () => res(reader.result as string);
                reader.readAsDataURL(blob);
              });
            }
          }
        } catch { /* map optional */ }
      }

      // 2. Hero photo — prefer persisted hero override, fall back to listing photo
      const resolvedHeroUrl = persistence.state.heroPhotoUrl ?? photoUrl;
      const heroBase64 = resolvedHeroUrl ? await toCompatibleBase64(resolvedHeroUrl) : null;

      // 3. Gallery — use ordered gallery from persisted state
      const galleryIds = persistence.state.galleryPhotoIds;
      const orderedGallery = galleryIds.length
        ? galleryIds.map(id => additionalPhotos.find(p => p.id === id)).filter(Boolean) as typeof additionalPhotos
        : additionalPhotos;
      const galleryBase64 = await convertPhotosToBase64(orderedGallery);

      // 4. Build normalized data (merge persisted overrides)
      const mergedOverrides = {
        ...overrides,
        heroPhotoId: persistence.state.heroPhotoId ?? overrides.heroPhotoId,
        galleryPhotoIds: persistence.state.galleryPhotoIds.length
          ? persistence.state.galleryPhotoIds
          : (overrides.galleryPhotoIds ?? []),
        templateKey: persistence.state.templateKey,
      };

      const brochureData = buildBrochureData({
        listing: {
          ...listing,
          photo_url: heroBase64 ?? resolvedHeroUrl,
          latitude: coordinates.lat,
          longitude: coordinates.lng,
        },
        marketing,
        staticMapBase64,
        photos: galleryBase64.map(p => ({ id: p.id, photo_url: p.photo_url, caption: p.caption, sort_order: p.sort_order })),
        overrides: mergedOverrides,
        includeConfidential,
      });

      // 5. Render
      const blob = await pdf(<BrochureEngine data={brochureData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${listing.address.replace(/[^a-zA-Z0-9]/g, '-')}-Brochure.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded!');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  // ── IDML export ───────────────────────────────────────────────────────────────
  const downloadIDML = () => {
    if (!marketing) return;
    const payload = {
      metadata: { version: '2.0', generated: new Date().toISOString(), listing_id: listing.id, listing_number: listing.listing_number },
      assets: { photo_url: photoUrl, latitude: coordinates.lat, longitude: coordinates.lng },
      content: {
        headline: overrides.headline ?? marketing.headline,
        tagline:  overrides.tagline  ?? marketing.tagline,
        address:  listing.display_address || listing.address,
        city:     listing.city,
        submarket: listing.submarket,
        deal_type: listing.deal_type,
        description: overrides.description ?? marketing.description,
        highlights:  overrides.highlights  ?? marketing.highlights,
        broker_pitch: includeConfidential ? marketing.broker_pitch : null,
      },
      specifications: {
        size_sf: listing.size_sf, warehouse_sf: listing.warehouse_sf, office_sf: listing.office_sf,
        land_acres: listing.land_acres, clear_height_ft: listing.clear_height_ft,
        dock_doors: listing.dock_doors, drive_in_doors: listing.drive_in_doors,
        loading_type: listing.loading_type, power: listing.power, yard: listing.yard,
        zoning: listing.zoning, property_type: listing.property_type,
      },
      financials: {
        asking_rent_psf: listing.asking_rent_psf, asking_sale_price: listing.asking_sale_price,
        cam: listing.cam, op_costs: listing.op_costs, taxes: listing.taxes, gross_rate: listing.gross_rate,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${listing.address.replace(/[^a-zA-Z0-9]/g, '-')}-IDML-Data.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('IDML data exported!');
  };

  const hasLocation = !!(coordinates.lat && coordinates.lng);
  const displayMarketing = marketing
    ? {
        headline:    overrides.headline    ?? marketing.headline,
        tagline:     overrides.tagline     ?? marketing.tagline,
        description: overrides.description ?? marketing.description,
        highlights:  overrides.highlights  ?? marketing.highlights,
        broker_pitch: marketing.broker_pitch,
      }
    : null;

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (isLoadingState) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6 items-start">

      {/* ── LEFT: Editor Panel ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        <BrochureEditorPanel
          state={persistence.state}
          photos={additionalPhotos}
          heroPhotoUrl={photoUrl}
          isSaving={isSaving}
          onUpdate={persistence.updateState}
          onSave={saveState}
          onResetOverrides={resetOverrides}
        />
      </div>

      {/* ── RIGHT: Media, Map, Generate, Download ──────────────────────────── */}
      <div className="space-y-6">

        {/* Hero Photo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />Brochure Photo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {photoUrl ? (
              <div className="space-y-4">
                <AspectRatio ratio={16/9} className="overflow-hidden rounded-lg border">
                  <img src={photoUrl} alt="Listing photo" className="object-cover w-full h-full" />
                </AspectRatio>
                <div className="flex gap-2">
                  <div {...getRootProps()} className="flex-1">
                    <input {...getInputProps()} />
                    <Button variant="outline" className="w-full" disabled={isUploadingPhoto}>
                      {isUploadingPhoto ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                      Replace Photo
                    </Button>
                  </div>
                  <Button variant="outline" onClick={handleRemovePhoto}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ) : (
              <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}>
                <input {...getInputProps()} />
                {isUploadingPhoto ? <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" /> : <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />}
                <p className="text-sm text-muted-foreground">{isDragActive ? 'Drop image here...' : 'Drag & drop a photo, or click to select'}</p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG, or WebP up to 10MB</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Photos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Images className="h-4 w-4" />Gallery Photos
              {additionalPhotos.length > 0 && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{additionalPhotos.length}</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {additionalPhotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {additionalPhotos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <AspectRatio ratio={4/3} className="overflow-hidden rounded border border-border">
                      <img src={photo.photo_url} alt="Property photo" className="object-cover w-full h-full" />
                    </AspectRatio>
                    <Button
                      variant="destructive" size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deletePhoto.mutate(photo.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div {...getAddlRootProps()} className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isAddlDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}>
              <input {...getAddlInputProps()} />
              {isUploadingAdditional ? <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin text-primary" /> : <Plus className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />}
              <p className="text-sm text-muted-foreground">{isAddlDragActive ? 'Drop images here...' : 'Add more gallery photos'}</p>
              <p className="text-xs text-muted-foreground mt-1">Drag to reorder in the editor panel on the left</p>
            </div>
          </CardContent>
        </Card>

        {/* Location Map */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />Location Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasLocation ? (
              <div className="space-y-2">
                <div className="relative">
                  <AspectRatio ratio={16/9} className="overflow-hidden rounded-lg border border-border bg-muted">
                    {mapLoading ? (
                      <div className="flex items-center justify-center h-full"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                    ) : mapError ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground"><MapPin className="h-6 w-6 mb-2" /><p className="text-xs">{mapError}</p></div>
                    ) : mapImageUrl ? (
                      <img src={mapImageUrl} alt="Location map" className="object-cover w-full h-full" />
                    ) : (
                      <div className="flex items-center justify-center h-full"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                    )}
                  </AspectRatio>
                  <div className="absolute top-2 right-2 flex flex-col gap-1">
                    <div className="flex flex-col bg-background/90 backdrop-blur-sm rounded border border-border shadow-sm">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none rounded-t" onClick={handleZoomIn} disabled={mapZoom >= 20 || mapLoading}><ZoomIn className="h-4 w-4" /></Button>
                      <div className="text-xs text-center py-0.5 border-y border-foreground/20 font-mono">{mapZoom}</div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none rounded-b" onClick={handleZoomOut} disabled={mapZoom <= 10 || mapLoading}><ZoomOut className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm rounded border border-border shadow-sm p-1">
                    <div className="grid grid-cols-3 gap-0.5">
                      <div /><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePan('up')} disabled={mapLoading}><ChevronUp className="h-4 w-4" /></Button><div />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePan('left')} disabled={mapLoading}><ChevronLeft className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleResetMap} disabled={mapLoading} title="Reset"><RotateCcw className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePan('right')} disabled={mapLoading}><ChevronRight className="h-4 w-4" /></Button>
                      <div /><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePan('down')} disabled={mapLoading}><ChevronDown className="h-4 w-4" /></Button><div />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">Adjust zoom and position • Map will be included in PDF</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <MapPin className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-1">No location coordinates available</p>
                <p className="text-xs text-muted-foreground mb-4">Geocode the listing to include a map in the brochure</p>
                <Button variant="outline" onClick={handleGeocode} disabled={isGeocoding}>
                  {isGeocoding ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <MapPin className="h-4 w-4 mr-2" />}
                  Geocode Address
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generate */}
        {!marketing && !isGenerating && (
          <Card>
            <CardContent className="py-12 text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">AI-Powered Marketing</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Generate professional marketing copy including headlines, descriptions, and key highlights.
              </p>
              <Button onClick={generateMarketing} size="lg">
                <Sparkles className="h-4 w-4 mr-2" />Generate Marketing Content
              </Button>
            </CardContent>
          </Card>
        )}
        {isGenerating && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Generating marketing content…</p>
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

        {/* Generated content preview + downloads */}
        {displayMarketing && !isGenerating && (
          <>
            {/* Content preview (read-only — editing happens in left panel) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Marketing Preview</span>
                  <Button variant="outline" size="sm" onClick={generateMarketing} disabled={isGenerating}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Regenerate
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Headline</p>
                  <p className="text-lg font-semibold">{displayMarketing.headline}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tagline</p>
                  <p className="text-primary">{displayMarketing.tagline}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-sm leading-relaxed line-clamp-3 text-muted-foreground">{displayMarketing.description}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Key Highlights</p>
                  <ul className="space-y-1">
                    {displayMarketing.highlights.slice(0, 4).map((h, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        <span className="text-sm">{h}</span>
                      </li>
                    ))}
                    {displayMarketing.highlights.length > 4 && (
                      <li className="text-xs text-muted-foreground pl-3.5">+{displayMarketing.highlights.length - 4} more</li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Confidential broker notes */}
            <Card className="border border-border bg-muted/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
                  Confidential Broker Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{displayMarketing.broker_pitch}</p>
              </CardContent>
            </Card>

            {/* Download / Export */}
            <Card>
              <CardContent className="py-6">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button onClick={downloadPDF} disabled={isDownloading} size="lg">
                    {isDownloading
                      ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      : <FileText className="h-4 w-4 mr-2" />
                    }
                    Download PDF Brochure
                  </Button>
                  <Button variant="outline" onClick={downloadIDML} size="lg">
                    <Download className="h-4 w-4 mr-2" />Export for InDesign
                  </Button>
                  <Button variant="ghost" size="lg" onClick={saveState} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Saving…' : 'Save Brochure'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Changes are saved to your account • Edit content in the panel on the left
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
