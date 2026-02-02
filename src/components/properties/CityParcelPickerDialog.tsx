import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Check, AlertTriangle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CityParcelPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  onSelectParcel: (address: string) => void;
}

interface Parcel {
  address: string;
  latitude: number;
  longitude: number;
  roll_number?: string;
  community_name?: string;
}

export function CityParcelPickerDialog({
  open,
  onOpenChange,
  address,
  city,
  latitude,
  longitude,
  onSelectParcel,
}: CityParcelPickerDialogProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const circlesRef = useRef<google.maps.Circle[]>([]);
  const propertyMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(
    latitude && longitude ? { lat: latitude, lng: longitude } : null
  );

  // Get Google Maps API key
  useEffect(() => {
    if (!open) return;
    
    const fetchApiKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-google-maps-token', {
          body: { authenticated: true },
        });
        if (error || !data?.apiKey) {
          throw new Error('Failed to get Google Maps API key');
        }
        setApiKey(data.apiKey);
      } catch (err) {
        console.error('Error getting API key:', err);
        setError('Failed to load map configuration.');
      }
    };
    
    fetchApiKey();
  }, [open]);

  // Geocode the property address if we don't have coordinates
  const geocodeAddress = useCallback(async () => {
    if (center) return center;
    if (!apiKey) return null;
    
    setGeocoding(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address + ', ' + city)}&key=${apiKey}&region=CA`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        const newCenter = { lat: location.lat, lng: location.lng };
        setCenter(newCenter);
        return newCenter;
      }
      throw new Error('Could not geocode address');
    } catch (err) {
      console.error('Geocoding error:', err);
      setError('Could not locate the property address on the map.');
      return null;
    } finally {
      setGeocoding(false);
    }
  }, [address, city, center, apiKey]);

  // Fetch nearby parcels from Calgary's database
  const fetchParcels = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('search-calgary-parcels', {
        body: { latitude: lat, longitude: lng, radiusMeters: 500 },
      });

      if (error) throw error;

      const parcelList: Parcel[] = Array.isArray(data?.parcels) ? data.parcels : [];
      setParcels(parcelList);

      if (parcelList.length === 0) {
        setError('No Calgary parcels found near this location. Try a different address.');
      }
    } catch (err: any) {
      console.error('Error fetching parcels:', err);
      setError('Failed to fetch nearby parcels from Calgary database.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize map and fetch parcels when API key is ready
  useEffect(() => {
    if (!open || !apiKey) return;

    const init = async () => {
      const coords = await geocodeAddress();
      if (coords) {
        await fetchParcels(coords.lat, coords.lng);
      }
    };

    init();
  }, [open, apiKey, geocodeAddress, fetchParcels]);

  // Open My Property map in new tab
  // Calgary My Property uses lng,lat order for coordinates
  const openMyPropertyMap = () => {
    if (!center) return;
    const url = `https://maps.calgary.ca/myproperty/?find=${center.lng},${center.lat}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Extract street number from address
  const getStreetNumber = (addr: string): string => {
    const match = addr.match(/^(\d+[A-Za-z]?)/);
    return match ? match[1] : addr.split(' ')[0];
  };

  // Initialize Google Maps (only when center/parcels change, NOT on selection)
  useEffect(() => {
    if (!open || !center || !mapRef.current || !apiKey) return;

    const initMap = async () => {
      try {
        // Load Google Maps script if not already loaded
        if (!window.google?.maps?.Map) {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&callback=__initGoogleMaps__`;
          script.async = true;
          
          await new Promise<void>((resolve, reject) => {
            (window as any).__initGoogleMaps__ = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        // Create map with satellite/hybrid view
        const map = new google.maps.Map(mapRef.current!, {
          center,
          zoom: 18,
          mapId: 'parcel-picker-map',
          mapTypeId: 'hybrid',
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: true,
          fullscreenControl: false,
        });

        mapInstanceRef.current = map;

        // Clear existing markers and circles
        markersRef.current.forEach(m => m.map = null);
        markersRef.current = [];
        circlesRef.current.forEach(c => c.setMap(null));
        circlesRef.current = [];
        if (propertyMarkerRef.current) {
          propertyMarkerRef.current.map = null;
        }

        // Add property location marker (blue pin with label)
        const propertyLabelDiv = document.createElement('div');
        propertyLabelDiv.innerHTML = `
          <div style="
            background: #3b82f6;
            color: white;
            padding: 8px 12px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            border: 3px solid white;
            text-align: center;
            white-space: nowrap;
          ">
            📍 Current Location
          </div>
        `;

        const propertyMarker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: center,
          title: 'Current Property Location',
          content: propertyLabelDiv,
          zIndex: 1000,
        });
        propertyMarkerRef.current = propertyMarker;

        // Add parcel markers with labels and circles
        parcels.forEach((parcel) => {
          const streetNumber = getStreetNumber(parcel.address);
          
          // Create custom label marker
          const labelDiv = document.createElement('div');
          labelDiv.className = 'parcel-marker';
          labelDiv.dataset.address = parcel.address;
          labelDiv.innerHTML = `
            <div style="
              background: #f59e0b;
              color: white;
              padding: 6px 10px;
              border-radius: 6px;
              font-weight: bold;
              font-size: 14px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.4);
              border: 2px solid white;
              cursor: pointer;
              transition: transform 0.2s;
              white-space: nowrap;
            ">
              ${streetNumber}
            </div>
          `;

          const marker = new google.maps.marker.AdvancedMarkerElement({
            map,
            position: { lat: parcel.latitude, lng: parcel.longitude },
            title: parcel.address,
            content: labelDiv,
            zIndex: 100,
          });

          marker.addListener('click', () => {
            setSelectedParcel(parcel);
          });

          markersRef.current.push(marker);

          // Add semi-transparent circle around parcel
          const circle = new google.maps.Circle({
            map,
            center: { lat: parcel.latitude, lng: parcel.longitude },
            radius: 30, // ~30m radius for typical lot
            fillColor: '#f59e0b',
            fillOpacity: 0.15,
            strokeColor: '#f59e0b',
            strokeOpacity: 0.4,
            strokeWeight: 2,
            clickable: true,
          });

          circle.addListener('click', () => {
            setSelectedParcel(parcel);
          });

          circlesRef.current.push(circle);
        });
      } catch (err) {
        console.error('Error initializing map:', err);
        setError('Failed to load the map. Please try again.');
      }
    };

    initMap();

    return () => {
      markersRef.current.forEach(m => m.map = null);
      markersRef.current = [];
      circlesRef.current.forEach(c => c.setMap(null));
      circlesRef.current = [];
      if (propertyMarkerRef.current) {
        propertyMarkerRef.current.map = null;
      }
    };
  }, [open, center, parcels, apiKey]);

  // Update marker/circle styles when selection changes (without re-initializing map)
  useEffect(() => {
    if (!mapInstanceRef.current || parcels.length === 0) return;

    // Update marker styles
    markersRef.current.forEach((marker, idx) => {
      const parcel = parcels[idx];
      if (!parcel) return;
      
      const isSelected = selectedParcel?.address === parcel.address;
      const labelDiv = marker.content as HTMLElement;
      if (labelDiv) {
        const innerDiv = labelDiv.querySelector('div');
        if (innerDiv) {
          innerDiv.style.background = isSelected ? '#22c55e' : '#f59e0b';
        }
      }
      marker.zIndex = isSelected ? 999 : 100;
    });

    // Update circle styles
    circlesRef.current.forEach((circle, idx) => {
      const parcel = parcels[idx];
      if (!parcel) return;
      
      const isSelected = selectedParcel?.address === parcel.address;
      circle.setOptions({
        fillColor: isSelected ? '#22c55e' : '#f59e0b',
        strokeColor: isSelected ? '#22c55e' : '#f59e0b',
      });
    });
  }, [selectedParcel, parcels]);

  const handleConfirm = () => {
    if (selectedParcel) {
      onSelectParcel(selectedParcel.address);
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setSelectedParcel(null);
    setParcels([]);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Select Calgary Parcel
          </DialogTitle>
          <DialogDescription>
            Click on an orange label to select the correct parcel. Use satellite view to identify buildings.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 space-y-4">
          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={openMyPropertyMap}
              disabled={!center}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open in My Property
            </Button>
            <span className="text-xs text-muted-foreground">
              View official parcel boundaries on Calgary's map
            </span>
          </div>

          {/* Map Container */}
          <div className="relative h-[400px] rounded-lg overflow-hidden border bg-muted">
            {(loading || geocoding) && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">
                    {geocoding ? 'Locating property...' : 'Loading nearby parcels...'}
                  </span>
                </div>
              </div>
            )}
            {error && !loading && !geocoding && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="text-center p-4">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
            )}
            <div ref={mapRef} className="w-full h-full" />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Current Property</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span>Calgary Parcels ({parcels.length})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Selected Parcel</span>
            </div>
          </div>

          {/* Selected Parcel Info */}
          {selectedParcel && (
            <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-green-900 dark:text-green-100">
                    {selectedParcel.address}
                  </p>
                  {selectedParcel.community_name && (
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {selectedParcel.community_name}
                    </p>
                  )}
                  {selectedParcel.roll_number && (
                    <p className="text-xs text-green-600 dark:text-green-400 font-mono mt-1">
                      Roll: {selectedParcel.roll_number}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Parcel List (scrollable) */}
          {parcels.length > 0 && (
            <div className="max-h-[150px] overflow-y-auto space-y-1">
              <p className="text-xs text-muted-foreground mb-2">
                {parcels.length} parcel{parcels.length !== 1 ? 's' : ''} found within 500m:
              </p>
              {parcels.map((parcel, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedParcel(parcel)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedParcel?.address === parcel.address
                      ? 'bg-green-100 dark:bg-green-900/50 border-green-300 dark:border-green-700'
                      : 'hover:bg-muted border-transparent'
                  } border`}
                >
                  <span className="font-medium">{parcel.address}</span>
                  {parcel.community_name && (
                    <span className="text-muted-foreground ml-2 text-xs">
                      ({parcel.community_name})
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedParcel}
          >
            <Check className="h-4 w-4 mr-2" />
            Use This Address
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
