import { useState, useRef, useEffect, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Listing } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MapPin, Crosshair, RotateCcw } from 'lucide-react';

interface EditPinLocationDialogProps {
  listing: Listing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

export function EditPinLocationDialog({ 
  listing, 
  open, 
  onOpenChange,
  onSave 
}: EditPinLocationDialogProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [newLocation, setNewLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Original location for reset
  const originalLocation = listing?.latitude && listing?.longitude 
    ? { lat: listing.latitude, lng: listing.longitude }
    : null;

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        if (data?.token) {
          setMapboxToken(data.token);
        }
      } catch (err) {
        console.error('Failed to fetch Mapbox token:', err);
        toast.error('Failed to load map');
      }
    };

    if (open && !mapboxToken) {
      fetchToken();
    }
  }, [open, mapboxToken]);

  // Update marker position
  const updateMarker = useCallback((lat: number, lng: number) => {
    if (!mapRef.current) return;

    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
    } else {
      const el = document.createElement('div');
      el.className = 'custom-pin-marker';
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

      markerRef.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!open || !mapboxToken || !mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = mapboxToken;

    // Default center: Calgary, or listing's current location
    const center: [number, number] = originalLocation 
      ? [originalLocation.lng, originalLocation.lat]
      : [-114.0719, 51.0447];

    const zoom = originalLocation ? 15 : 10;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center,
      zoom,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('load', () => {
      setMapReady(true);
      
      // Add marker if there's an existing location
      if (originalLocation) {
        updateMarker(originalLocation.lat, originalLocation.lng);
      }
    });

    // Click handler to place/move pin
    map.on('click', (e) => {
      const { lat, lng } = e.lngLat;
      setNewLocation({ lat, lng });
      updateMarker(lat, lng);
    });

    mapRef.current = map;

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [open, mapboxToken, originalLocation, updateMarker]);

  // Reset to original or clear
  const handleReset = () => {
    setNewLocation(null);
    if (originalLocation && mapRef.current) {
      updateMarker(originalLocation.lat, originalLocation.lng);
      mapRef.current.flyTo({ center: [originalLocation.lng, originalLocation.lat], zoom: 15 });
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  };

  // Center on current marker
  const handleCenterOnPin = () => {
    if (!mapRef.current) return;
    
    const loc = newLocation || originalLocation;
    if (loc) {
      mapRef.current.flyTo({ center: [loc.lng, loc.lat], zoom: 16 });
    }
  };

  // Save location
  const handleSave = async () => {
    if (!listing || !newLocation) {
      toast.error('Please click on the map to set a location');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('listings')
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

  const displayName = listing?.property_name || listing?.display_address || listing?.address || 'Unknown Property';
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
