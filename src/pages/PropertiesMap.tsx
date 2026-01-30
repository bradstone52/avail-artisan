import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProperties, PropertyWithLinks } from '@/hooks/useProperties';
import { useGeolocation } from '@/hooks/useGeolocation';
import { usePropertyTenants } from '@/hooks/usePropertyTenants';
import { PropertyEditDialog } from '@/components/properties/PropertyEditDialog';
import { AddTenantDialog } from '@/components/properties/AddTenantDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import {
  ArrowLeft,
  MapPin,
  Loader2,
  Plus,
  Users,
  Building2,
  Navigation,
  AlertCircle,
  Eye,
  MapPinned,
} from 'lucide-react';

// Helper to calculate distance between two points (Haversine formula)
function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function PropertiesMap() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { properties, loading: propertiesLoading, createProperty, fetchProperties } = useProperties();
  const { createTenant } = usePropertyTenants();
  const {
    latitude: userLat,
    longitude: userLng,
    loading: geoLoading,
    error: geoError,
    permissionDenied,
    getCurrentPosition,
  } = useGeolocation({ enableHighAccuracy: true, timeout: 15000 });

  // Map state
  const [mapToken, setMapToken] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const userMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // Dialog state
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithLinks | null>(null);
  const [propertyDialogOpen, setPropertyDialogOpen] = useState(false);
  const [tenantDialogOpen, setTenantDialogOpen] = useState(false);
  const [newPropertyCoords, setNewPropertyCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [reverseGeocodedAddress, setReverseGeocodedAddress] = useState<string>('');
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [pendingPropertyId, setPendingPropertyId] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Fetch map token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-google-maps-token', {
          body: { authenticated: true }
        });
        if (error) throw error;
        setMapToken(data.apiKey);
      } catch (err: any) {
        console.error('Error fetching map token:', err);
        setMapError('Failed to load map');
      }
    };
    fetchToken();
  }, []);

  // Create property marker element
  const createPropertyMarkerElement = useCallback((hasTenants: boolean) => {
    const el = document.createElement('div');
    const bgColor = hasTenants ? 'hsl(142 71% 45%)' : 'hsl(217 91% 53%)'; // Green if has tenants, blue otherwise
    el.innerHTML = `
      <div style="
        width: 36px;
        height: 36px;
        background: ${bgColor};
        border: 3px solid hsl(0 0% 7%);
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 3px 3px 0 hsl(0 0% 7%);
        transition: transform 0.15s;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
          <path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/>
        </svg>
      </div>
    `;
    return el;
  }, []);

  // Create user location marker
  const createUserMarkerElement = useCallback(() => {
    const el = document.createElement('div');
    el.innerHTML = `
      <div style="
        width: 20px;
        height: 20px;
        background: hsl(217 91% 53%);
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 0 0 2px hsl(217 91% 53%), 0 0 20px hsl(217 91% 53% / 0.5);
        animation: pulse 2s infinite;
      "></div>
      <style>
        @keyframes pulse {
          0% { box-shadow: 0 0 0 2px hsl(217 91% 53%), 0 0 20px hsl(217 91% 53% / 0.5); }
          50% { box-shadow: 0 0 0 4px hsl(217 91% 53% / 0.5), 0 0 30px hsl(217 91% 53% / 0.3); }
          100% { box-shadow: 0 0 0 2px hsl(217 91% 53%), 0 0 20px hsl(217 91% 53% / 0.5); }
        }
      </style>
    `;
    return el;
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || !mapToken || mapRef.current) return;

    const initMap = async () => {
      try {
        setOptions({ key: mapToken, v: 'weekly' });
        const { Map } = await importLibrary('maps') as google.maps.MapsLibrary;

        if (!mapContainerRef.current) return;

        // Default to Calgary, or URL params if provided
        const defaultLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : 51.0447;
        const defaultLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : -114.0719;

        const map = new Map(mapContainerRef.current, {
          center: { lat: defaultLat, lng: defaultLng },
          zoom: 14, // ~1 mile view
          mapTypeId: 'hybrid',
          mapId: 'properties-map',
          gestureHandling: 'greedy',
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        });

        mapRef.current = map;

        // Click handler for adding new properties
        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          handleMapClick(e.latLng.lat(), e.latLng.lng());
        });
      } catch (err) {
        console.error('Failed to initialize map:', err);
        setMapError('Failed to load map');
      }
    };

    initMap();
  }, [mapToken, searchParams]);

  // Handle map click - reverse geocode and open property dialog
  const handleMapClick = async (lat: number, lng: number) => {
    setNewPropertyCoords({ lat, lng });
    setIsReverseGeocoding(true);
    setReverseGeocodedAddress('');

    try {
      // Use Google Geocoding API to get address
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${mapToken}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        // Get the most specific address
        const address = data.results[0].formatted_address;
        setReverseGeocodedAddress(address);
      } else {
        setReverseGeocodedAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } catch (err) {
      console.error('Reverse geocoding failed:', err);
      setReverseGeocodedAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } finally {
      setIsReverseGeocoding(false);
      setPropertyDialogOpen(true);
    }
  };

  // Add property markers
  useEffect(() => {
    if (!mapRef.current || !mapToken || propertiesLoading) return;

    const addMarkers = async () => {
      // Clear existing markers
      markersRef.current.forEach((marker) => {
        marker.map = null;
      });
      markersRef.current.clear();

      const { AdvancedMarkerElement } = await importLibrary('marker') as google.maps.MarkerLibrary;

      // Filter properties with valid coordinates
      const mappableProperties = properties.filter(
        (p) => p.latitude && p.longitude && Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
      );

      mappableProperties.forEach((property) => {
        // Check if property has tenants (this would require fetching tenant counts)
        // For now, we'll just use blue markers
        const el = createPropertyMarkerElement(false);

        const marker = new AdvancedMarkerElement({
          map: mapRef.current!,
          position: { lat: property.latitude!, lng: property.longitude! },
          content: el,
        });

        marker.addListener('click', () => {
          showPropertyPopup(property, marker);
        });

        markersRef.current.set(property.id, marker);
      });
    };

    addMarkers();
  }, [properties, mapToken, propertiesLoading, createPropertyMarkerElement]);

  // Show property popup
  const showPropertyPopup = (property: PropertyWithLinks, marker: google.maps.marker.AdvancedMarkerElement) => {
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }

    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="font-family: Inter, sans-serif; padding: 16px; max-width: 300px;">
          <div style="font-weight: 900; font-size: 16px; color: #111; margin-bottom: 6px;">
            ${property.name || property.address}
          </div>
          <div style="font-size: 13px; color: #555; margin-bottom: 12px;">
            ${property.city || ''} ${property.submarket ? '· ' + property.submarket : ''}
          </div>
          <div style="display: flex; gap: 8px;">
            <button id="view-property-${property.id}" style="
              padding: 8px 12px;
              background: #f3f4f6;
              border: 2px solid #111;
              border-radius: 6px;
              font-weight: 600;
              font-size: 13px;
              cursor: pointer;
            ">View Details</button>
            <button id="add-tenant-${property.id}" style="
              padding: 8px 12px;
              background: hsl(217 91% 53%);
              color: white;
              border: 2px solid #111;
              border-radius: 6px;
              font-weight: 600;
              font-size: 13px;
              cursor: pointer;
            ">Add Tenant</button>
          </div>
        </div>
      `,
      pixelOffset: new google.maps.Size(0, -20),
    });

    infoWindow.open(mapRef.current, marker);
    infoWindowRef.current = infoWindow;

    // Add event listeners after the info window opens
    google.maps.event.addListenerOnce(infoWindow, 'domready', () => {
      document.getElementById(`view-property-${property.id}`)?.addEventListener('click', () => {
        navigate(`/properties/${property.id}`);
      });
      document.getElementById(`add-tenant-${property.id}`)?.addEventListener('click', () => {
        setSelectedProperty(property);
        setTenantDialogOpen(true);
        infoWindow.close();
      });
    });
  };

  // Update user location marker
  useEffect(() => {
    if (!mapRef.current || !mapToken || userLat === null || userLng === null) return;

    const updateUserMarker = async () => {
      const { AdvancedMarkerElement } = await importLibrary('marker') as google.maps.MarkerLibrary;

      if (userMarkerRef.current) {
        userMarkerRef.current.position = { lat: userLat, lng: userLng };
      } else {
        const el = createUserMarkerElement();
        userMarkerRef.current = new AdvancedMarkerElement({
          map: mapRef.current!,
          position: { lat: userLat, lng: userLng },
          content: el,
          zIndex: 1000,
        });
      }

      // Center map on user location
      mapRef.current?.panTo({ lat: userLat, lng: userLng });
    };

    updateUserMarker();
  }, [userLat, userLng, mapToken, createUserMarkerElement]);

  // Handle saving new property
  const handleSaveProperty = async (propertyData: Partial<PropertyWithLinks>) => {
    const created = await createProperty({
      ...propertyData,
      latitude: newPropertyCoords?.lat,
      longitude: newPropertyCoords?.lng,
    });

    if (created) {
      setPropertyDialogOpen(false);
      setPendingPropertyId(created.id);
      setSelectedProperty(created);
      // Refresh properties to show new marker
      fetchProperties();
      // Open tenant dialog for the new property
      setTimeout(() => {
        setTenantDialogOpen(true);
      }, 300);
    }
  };

  // Handle saving tenant
  const handleSaveTenant = async (data: {
    tenant_name: string;
    unit_number?: string | null;
    size_sf?: number | null;
    notes?: string | null;
  }) => {
    if (!selectedProperty) return false;

    const result = await createTenant({
      property_id: selectedProperty.id,
      ...data,
    });

    if (result) {
      toast({
        title: 'Tenant added',
        description: `Added ${data.tenant_name} to ${selectedProperty.name || selectedProperty.address}`,
      });
      return true;
    }
    return false;
  };

  // Center on user location
  const handleCenterOnUser = () => {
    if (userLat && userLng && mapRef.current) {
      mapRef.current.panTo({ lat: userLat, lng: userLng });
      mapRef.current.setZoom(15);
    } else {
      getCurrentPosition();
    }
  };

  // Batch geocode properties without coordinates
  const handleGeocodeAll = async () => {
    const needsGeocoding = properties.filter(p => !p.latitude || !p.longitude).length;
    if (needsGeocoding === 0) {
      toast({ title: 'All properties already geocoded' });
      return;
    }

    setIsGeocoding(true);
    try {
      const { data, error } = await supabase.functions.invoke('batch-geocode-properties');
      if (error) throw error;
      
      toast({
        title: 'Geocoding complete',
        description: `${data.geocoded} properties geocoded, ${data.failed} failed`
      });
      fetchProperties();
    } catch (err: any) {
      toast({
        title: 'Geocoding failed',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/properties')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Properties Map</h1>
              <p className="text-sm text-muted-foreground">
                Tap properties or map to track tenants
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {properties.filter(p => !p.latitude || !p.longitude).length > 0 && (
              <Button
                variant="outline"
                onClick={handleGeocodeAll}
                disabled={isGeocoding}
                className="min-h-[44px]"
              >
                {isGeocoding ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <MapPinned className="h-5 w-5" />
                )}
                <span className="ml-2 hidden sm:inline">Geocode All</span>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleCenterOnUser}
              disabled={geoLoading}
              className="min-w-[44px] min-h-[44px]"
            >
              {geoLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Navigation className="h-5 w-5" />
              )}
              <span className="ml-2 hidden sm:inline">My Location</span>
            </Button>
          </div>
        </div>

        {/* GPS Status */}
        {(geoError || permissionDenied) && (
          <div className="px-4 py-2 bg-destructive/10 border-b flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {geoError}
          </div>
        )}

        {/* Map Container */}
        <div className="flex-1 relative">
          {mapError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-3" />
                <p className="text-lg font-semibold">{mapError}</p>
              </div>
            </div>
          ) : !mapToken ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div ref={mapContainerRef} className="absolute inset-0" />
          )}

          {/* Loading geocode overlay */}
          {isReverseGeocoding && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Getting address...</span>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Bottom Stats Bar */}
        <div className="p-3 border-t bg-background flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary border-2 border-foreground" />
              <span>{properties.filter(p => p.latitude && p.longitude).length} Properties on Map</span>
            </div>
            {userLat && userLng && (
              <Badge variant="outline" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                GPS Active
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Tap map to add new property
          </p>
        </div>
      </div>

      {/* Property Edit Dialog */}
      <PropertyEditDialog
        property={null}
        open={propertyDialogOpen}
        onOpenChange={(open) => {
          setPropertyDialogOpen(open);
          if (!open) {
            setNewPropertyCoords(null);
            setReverseGeocodedAddress('');
          }
        }}
        onSave={handleSaveProperty}
        mode="create"
      />

      {/* Add Tenant Dialog */}
      <AddTenantDialog
        open={tenantDialogOpen}
        onOpenChange={(open) => {
          setTenantDialogOpen(open);
          if (!open) {
            setSelectedProperty(null);
            setPendingPropertyId(null);
          }
        }}
        onSave={handleSaveTenant}
        propertyName={selectedProperty?.name || selectedProperty?.address}
      />
    </AppLayout>
  );
}
