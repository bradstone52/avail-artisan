import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MarketListing } from '@/hooks/useMarketListings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MapPin, Crosshair, RotateCcw } from 'lucide-react';

interface EditMarketPinDialogProps {
  listing: MarketListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

/**
 * Edit pin location dialog for market listings.
 */
export function EditMarketPinDialog({ 
  listing, 
  open, 
  onOpenChange,
  onSave 
}: EditMarketPinDialogProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const isInitializedRef = useRef(false);
  
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string | null>(null);
  const [newLocation, setNewLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const originalLocation = useMemo(() => {
    if (listing?.latitude && listing?.longitude) {
      return { lat: Number(listing.latitude), lng: Number(listing.longitude) };
    }
    return null;
  }, [listing?.latitude, listing?.longitude]);

  useEffect(() => {
    if (!open) {
      if (markerRef.current) {
        markerRef.current.map = null;
        markerRef.current = null;
      }
      mapRef.current = null;
      isInitializedRef.current = false;
      setMapReady(false);
      setNewLocation(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-google-maps-token', {
          body: { authenticated: true }
        });
        if (error) throw error;
        if (data?.apiKey) {
          setGoogleMapsApiKey(data.apiKey);
        }
      } catch (err) {
        console.error('Failed to fetch Google Maps API key:', err);
        toast.error('Failed to load map');
      }
    };

    if (!googleMapsApiKey) {
      fetchToken();
    }
  }, [open, googleMapsApiKey]);

  const createMarkerElement = useCallback(() => {
    const el = document.createElement('div');
    el.innerHTML = `
      <div style="
        width: 32px;
        height: 32px;
        background: #2563eb;
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `;
    return el;
  }, []);

  const updateMarker = useCallback(async (lat: number, lng: number) => {
    if (!mapRef.current) return;

    if (markerRef.current) {
      markerRef.current.position = { lat, lng };
    } else {
      const { AdvancedMarkerElement } = await importLibrary("marker") as google.maps.MarkerLibrary;
      markerRef.current = new AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat, lng },
        content: createMarkerElement(),
      });
    }
  }, [createMarkerElement]);

  useEffect(() => {
    if (!open || !googleMapsApiKey || isInitializedRef.current) {
      return;
    }

    const initTimer = setTimeout(async () => {
      if (!mapContainerRef.current || isInitializedRef.current) {
        return;
      }

      isInitializedRef.current = true;

      try {
        setOptions({
          key: googleMapsApiKey,
          v: "weekly",
        });

        const { Map } = await importLibrary("maps") as google.maps.MapsLibrary;

        if (!mapContainerRef.current) return;

        const center = originalLocation 
          ? { lat: originalLocation.lat, lng: originalLocation.lng }
          : { lat: 51.0447, lng: -114.0719 };

        const zoom = originalLocation ? 15 : 10;

        const map = new Map(mapContainerRef.current, {
          center,
          zoom,
          mapTypeId: "hybrid",
          mapId: "edit-market-pin-map",
          gestureHandling: "greedy",
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });

        mapRef.current = map;

        google.maps.event.addListenerOnce(map, "tilesloaded", () => {
          setMapReady(true);
          
          if (originalLocation) {
            updateMarker(originalLocation.lat, originalLocation.lng);
          }
        });

        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            setNewLocation({ lat, lng });
            updateMarker(lat, lng);
          }
        });
      } catch (err) {
        console.error('Failed to initialize Google Maps:', err);
        toast.error('Failed to load map');
      }
    }, 100);

    return () => clearTimeout(initTimer);
  }, [open, googleMapsApiKey, originalLocation, updateMarker]);

  const handleReset = useCallback(() => {
    setNewLocation(null);
    if (originalLocation && mapRef.current) {
      updateMarker(originalLocation.lat, originalLocation.lng);
      mapRef.current.panTo({ lat: originalLocation.lat, lng: originalLocation.lng });
      mapRef.current.setZoom(15);
    } else if (markerRef.current) {
      markerRef.current.map = null;
      markerRef.current = null;
    }
  }, [originalLocation, updateMarker]);

  const handleCenterOnPin = useCallback(() => {
    if (!mapRef.current) return;
    
    const loc = newLocation || originalLocation;
    if (loc) {
      mapRef.current.panTo({ lat: loc.lat, lng: loc.lng });
      mapRef.current.setZoom(16);
    }
  }, [newLocation, originalLocation]);

  const handleSave = async () => {
    if (!listing || !newLocation) {
      toast.error('Please click on the map to set a location');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('market_listings')
        .update({
          latitude: newLocation.lat,
          longitude: newLocation.lng,
          geocode_source: 'manual',
          geocoded_at: new Date().toISOString(),
        })
        .eq('id', listing.id);

      if (error) throw error;

      toast.success('Pin location updated');
      onSave?.();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to save location:', err);
      toast.error('Failed to save location');
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = listing?.display_address || listing?.address || 'Unknown Property';
  const hasNewLocation = newLocation !== null;
  const hasAnyLocation = hasNewLocation || originalLocation !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Edit Pin Location
          </DialogTitle>
          <DialogDescription className="text-sm">
            <span className="font-medium">{displayName}</span>
            <br />
            Click on the map to set or move the pin location for this listing.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 relative">
          <div ref={mapContainerRef} className="absolute inset-0" />
          
          {!mapReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading map...</p>
              </div>
            </div>
          )}

          {mapReady && (
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleCenterOnPin}
                disabled={!hasAnyLocation}
                className="shadow-lg"
              >
                <Crosshair className="w-4 h-4 mr-2" />
                Center on Pin
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleReset}
                disabled={!hasNewLocation}
                className="shadow-lg"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          )}

          {mapReady && (
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-background/95 backdrop-blur border rounded-lg px-4 py-3 shadow-lg">
                {newLocation ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-primary">New location set</p>
                      <p className="text-xs text-muted-foreground">
                        {newLocation.lat.toFixed(6)}, {newLocation.lng.toFixed(6)}
                      </p>
                    </div>
                    <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
                  </div>
                ) : originalLocation ? (
                  <div>
                    <p className="text-sm font-medium">Current location</p>
                    <p className="text-xs text-muted-foreground">
                      {originalLocation.lat.toFixed(6)}, {originalLocation.lng.toFixed(6)}
                      {listing?.geocode_source && (
                        <span className="ml-2 text-muted-foreground/70">
                          (Source: {listing.geocode_source})
                        </span>
                      )}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No location set. Click on the map to place a pin.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasNewLocation || isSaving}>
            {isSaving ? 'Saving...' : 'Save Location'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}