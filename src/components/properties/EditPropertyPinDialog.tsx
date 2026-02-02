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
import { PropertyWithLinks } from '@/hooks/useProperties';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MapPin, Crosshair, RotateCcw, Hand } from 'lucide-react';

interface EditPropertyPinDialogProps {
  property: PropertyWithLinks | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

export function EditPropertyPinDialog({ 
  property, 
  open, 
  onOpenChange,
  onSave 
}: EditPropertyPinDialogProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const isInitializedRef = useRef(false);
  
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string | null>(null);
  const [newLocation, setNewLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Memoize original location to prevent unnecessary re-renders
  const originalLocation = useMemo(() => {
    if (property?.latitude && property?.longitude) {
      return { lat: property.latitude, lng: property.longitude };
    }
    return null;
  }, [property?.latitude, property?.longitude]);

  // Clean up map when dialog closes
  useEffect(() => {
    if (!open) {
      // Clean up marker
      if (markerRef.current) {
        markerRef.current.map = null;
        markerRef.current = null;
      }
      // Clean up map - just null the reference, Google Maps cleans up automatically
      mapRef.current = null;
      // Reset initialization flag so map can be created again
      isInitializedRef.current = false;
      setMapReady(false);
      setNewLocation(null);
    }
  }, [open]);

  // Fetch Google Maps API key
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

  // Create marker element - with manual indicator style (orange ring)
  const createMarkerElement = useCallback((isManual: boolean = false) => {
    const el = document.createElement('div');
    const borderColor = isManual ? '#f97316' : 'white'; // Orange for manual
    el.innerHTML = `
      <div style="
        width: 36px;
        height: 36px;
        background: #2563eb;
        border: 4px solid ${borderColor};
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
          <path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/>
        </svg>
      </div>
    `;
    return el;
  }, []);

  // Update marker position
  const updateMarker = useCallback(async (lat: number, lng: number, isManual: boolean = false) => {
    if (!mapRef.current) return;

    if (markerRef.current) {
      markerRef.current.position = { lat, lng };
      // Update content to show manual indicator
      markerRef.current.content = createMarkerElement(isManual);
    } else {
      const { AdvancedMarkerElement } = await importLibrary("marker") as google.maps.MarkerLibrary;
      markerRef.current = new AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat, lng },
        content: createMarkerElement(isManual),
      });
    }
  }, [createMarkerElement]);

  // Initialize map - only when dialog is open, token is available, and not already initialized
  useEffect(() => {
    if (!open || !googleMapsApiKey || isInitializedRef.current) {
      return;
    }

    // Use a small delay to ensure the dialog container is mounted in the DOM
    const initTimer = setTimeout(async () => {
      if (!mapContainerRef.current || isInitializedRef.current) {
        return;
      }

      // Prevent double initialization
      isInitializedRef.current = true;

      try {
        // Set API options
        setOptions({
          key: googleMapsApiKey,
          v: "weekly",
        });

        // Import maps library
        const { Map } = await importLibrary("maps") as google.maps.MapsLibrary;

        if (!mapContainerRef.current) return;

        // Default center: Calgary, or property's current location
        const center = originalLocation 
          ? { lat: originalLocation.lat, lng: originalLocation.lng }
          : { lat: 51.0447, lng: -114.0719 };

        const zoom = originalLocation ? 17 : 10;

        const map = new Map(mapContainerRef.current, {
          center,
          zoom,
          mapTypeId: "hybrid",
          mapId: "edit-property-pin-map",
          gestureHandling: "greedy",
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });

        mapRef.current = map;

        google.maps.event.addListenerOnce(map, "tilesloaded", () => {
          setMapReady(true);
          
          // Add marker if there's an existing location
          if (originalLocation) {
            const isManualSource = property?.geocode_source === 'manual';
            updateMarker(originalLocation.lat, originalLocation.lng, isManualSource);
          }
        });

        // Click handler to place/move pin
        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            setNewLocation({ lat, lng });
            updateMarker(lat, lng, true); // Show as manual
          }
        });
      } catch (err) {
        console.error('Failed to initialize Google Maps:', err);
        toast.error('Failed to load map');
      }
    }, 100);

    return () => clearTimeout(initTimer);
  }, [open, googleMapsApiKey, originalLocation, updateMarker, property?.geocode_source]);

  // Reset to original or clear
  const handleReset = useCallback(() => {
    setNewLocation(null);
    if (originalLocation && mapRef.current) {
      const isManualSource = property?.geocode_source === 'manual';
      updateMarker(originalLocation.lat, originalLocation.lng, isManualSource);
      mapRef.current.panTo({ lat: originalLocation.lat, lng: originalLocation.lng });
      mapRef.current.setZoom(17);
    } else if (markerRef.current) {
      markerRef.current.map = null;
      markerRef.current = null;
    }
  }, [originalLocation, updateMarker, property?.geocode_source]);

  // Center on current marker
  const handleCenterOnPin = useCallback(() => {
    if (!mapRef.current) return;
    
    const loc = newLocation || originalLocation;
    if (loc) {
      mapRef.current.panTo({ lat: loc.lat, lng: loc.lng });
      mapRef.current.setZoom(18);
    }
  }, [newLocation, originalLocation]);

  // Save location
  const handleSave = async () => {
    if (!property || !newLocation) {
      toast.error('Please click on the map to set a location');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update({
          latitude: newLocation.lat,
          longitude: newLocation.lng,
          geocode_source: 'manual',
          geocoded_at: new Date().toISOString(),
        })
        .eq('id', property.id);

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

  const displayName = property?.name || property?.display_address || property?.address || 'Unknown Property';
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
            Click on the map to set or move the pin location for this property.
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

          {/* Map controls overlay */}
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

          {/* Location info overlay */}
          {mapReady && (
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-background/95 backdrop-blur border rounded-lg px-4 py-3 shadow-lg">
                {newLocation ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-primary flex items-center gap-1.5">
                        <Hand className="w-4 h-4" />
                        New location set (manual)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {newLocation.lat.toFixed(6)}, {newLocation.lng.toFixed(6)}
                      </p>
                    </div>
                    <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
                  </div>
                ) : originalLocation ? (
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      {property?.geocode_source === 'manual' && <Hand className="w-4 h-4 text-orange-500" />}
                      Current location
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {originalLocation.lat.toFixed(6)}, {originalLocation.lng.toFixed(6)}
                      {property?.geocode_source && (
                        <span className="ml-2 text-muted-foreground/70">
                          (Source: {property.geocode_source})
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
