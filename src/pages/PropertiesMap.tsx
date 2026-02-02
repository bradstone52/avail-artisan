import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProperties, PropertyWithLinks } from '@/hooks/useProperties';
import { useGeolocation } from '@/hooks/useGeolocation';
import { usePropertyTenants } from '@/hooks/usePropertyTenants';
import { useAuth } from '@/contexts/AuthContext';
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
  const { session, loading: authLoading } = useAuth();
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
  const [mapReady, setMapReady] = useState(false);

  // Fetch map token - wait for auth session to be ready (critical for PWA)
  useEffect(() => {
    // Don't fetch until auth has finished loading and we have a session
    if (authLoading) {
      console.log('[PropertiesMap] Waiting for auth to load...');
      return;
    }
    
    if (!session) {
      console.log('[PropertiesMap] No session available');
      setMapError('Please sign in to view the map');
      return;
    }

    const fetchToken = async () => {
      try {
        console.log('[PropertiesMap] Fetching map token with session...');
        const { data, error } = await supabase.functions.invoke('get-google-maps-token', {
          body: { authenticated: true }
        });
        if (error) {
          console.error('[PropertiesMap] Token fetch error:', error);
          throw error;
        }
        if (!data?.apiKey) {
          console.error('[PropertiesMap] No API key in response:', data);
          throw new Error('No API key returned');
        }
        console.log('[PropertiesMap] Token fetched successfully');
        setMapToken(data.apiKey);
      } catch (err: any) {
        console.error('[PropertiesMap] Error fetching map token:', err);
        setMapError(err.message || 'Failed to load map. Please try refreshing.');
      }
    };
    fetchToken();
  }, [authLoading, session]);

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
          zoom: 11,
          mapTypeId: 'hybrid',
          mapId: 'distribution-map', // Use same mapId as working distribution map
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

        // Mark map as ready after tiles load
        google.maps.event.addListenerOnce(map, 'tilesloaded', () => {
          console.log('[PropertiesMap] Tiles loaded, map ready');
          setMapReady(true);
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

  // Add property markers function
  const addMarkersToMap = useCallback(async () => {
    if (!mapRef.current || !mapToken) return;

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

    console.log(`[PropertiesMap] Adding ${mappableProperties.length} markers`);

    // Fit bounds to show all markers
    if (mappableProperties.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      
      mappableProperties.forEach((property) => {
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
        bounds.extend({ lat: property.latitude!, lng: property.longitude! });
      });

      // Fit map to show all markers
      mapRef.current.fitBounds(bounds, 50);
    }
  }, [properties, mapToken, createPropertyMarkerElement]);

  // Re-add markers when properties change or map becomes ready
  useEffect(() => {
    if (!mapRef.current || !mapToken || propertiesLoading || !mapReady) return;
    console.log('[PropertiesMap] Adding markers, mapReady:', mapReady, 'properties:', properties.length);
    addMarkersToMap();
  }, [properties, mapToken, propertiesLoading, mapReady, addMarkersToMap]);

  // Show property popup - Mobile optimized with larger touch targets
  const showPropertyPopup = (property: PropertyWithLinks, marker: google.maps.marker.AdvancedMarkerElement) => {
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }

    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="font-family: Inter, sans-serif; padding: 16px; width: 260px; box-sizing: border-box;">
          <div style="font-weight: 900; font-size: 16px; color: #111; margin-bottom: 6px; line-height: 1.2;">
            ${property.name || property.address}
          </div>
          <div style="font-size: 13px; color: #555; margin-bottom: 14px;">
            ${property.city || ''} ${property.submarket ? '· ' + property.submarket : ''}
          </div>
          <div style="display: flex; gap: 8px;">
            <button id="view-property-${property.id}" style="
              flex: 1;
              padding: 12px 8px;
              background: #f3f4f6;
              border: 2px solid #111;
              border-radius: 8px;
              font-weight: 700;
              font-size: 13px;
              cursor: pointer;
              min-height: 44px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              box-sizing: border-box;
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              Details
            </button>
            <button id="add-tenant-${property.id}" style="
              flex: 1;
              padding: 12px 8px;
              background: hsl(217 91% 53%);
              color: white;
              border: 2px solid #111;
              border-radius: 8px;
              font-weight: 700;
              font-size: 13px;
              cursor: pointer;
              min-height: 44px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              box-sizing: border-box;
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M19 8v6M22 11h-6"/>
              </svg>
              Tenant
            </button>
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
    lease_expiry?: string | null;
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

  // Center on user location with ~1km radius view
  // Zoom level 16 shows approximately 1.5km across, giving ~750m-1km radius
  const handleCenterOnUser = () => {
    if (userLat && userLng && mapRef.current) {
      mapRef.current.setCenter({ lat: userLat, lng: userLng });
      mapRef.current.setZoom(16);
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

  const needsGeocoding = properties.filter(p => !p.latitude || !p.longitude).length;

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col relative">
        {/* Map Container - Full bleed */}
        <div className="flex-1 relative">
          {mapError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center p-6">
                <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-3" />
                <p className="text-lg font-semibold mb-2">{mapError}</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMapError(null);
                    window.location.reload();
                  }}
                >
                  Try Again
                </Button>
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
              <Card className="p-6 mx-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-base font-medium">Getting address...</span>
                </div>
              </Card>
            </div>
          )}

          {/* Floating Top Bar - Mobile optimized */}
          <div className="absolute top-0 left-0 right-0 z-10 p-3 safe-area-top">
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="icon"
                onClick={() => navigate('/properties')}
                className="h-12 w-12 rounded-full shadow-lg border-2 border-foreground bg-card text-foreground hover:bg-muted"
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
              
              <div className="flex-1" />
              
              {needsGeocoding > 0 && (
                <Button
                  variant="default"
                  size="icon"
                  onClick={handleGeocodeAll}
                  disabled={isGeocoding}
                  className="h-12 w-12 rounded-full shadow-lg border-2 border-foreground bg-card text-foreground hover:bg-muted"
                  title="Geocode all properties"
                >
                  {isGeocoding ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <MapPinned className="h-6 w-6" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* GPS Error Banner */}
          {(geoError || permissionDenied) && (
            <div className="absolute top-20 left-3 right-3 z-10">
              <div className="px-4 py-3 bg-destructive/90 rounded-xl flex items-center gap-2 text-sm text-white shadow-lg">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">{geoError}</span>
              </div>
            </div>
          )}

          {/* Floating Action Buttons - Bottom Right - adjusted for mobile nav */}
          <div className="absolute bottom-44 md:bottom-24 right-3 z-10 flex flex-col gap-3">
            <Button
              variant="default"
              size="icon"
              onClick={handleCenterOnUser}
              disabled={geoLoading}
              className="h-14 w-14 rounded-full shadow-lg border-2 border-foreground bg-card text-foreground hover:bg-muted"
              title="Center on my location"
            >
              {geoLoading ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : (
                <Navigation className="h-7 w-7" />
              )}
            </Button>
          </div>

          {/* Bottom Info Card - adjusted for mobile nav */}
          <div className="absolute bottom-20 md:bottom-0 left-0 right-0 z-10 p-3 safe-area-bottom">
            <Card className="shadow-lg border-2 border-foreground">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-primary border-2 border-foreground" />
                      <span className="text-sm font-semibold">
                        {properties.filter(p => p.latitude && p.longitude).length} Properties
                      </span>
                    </div>
                    {userLat && userLng && (
                      <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                        <MapPin className="h-3 w-3" />
                        GPS
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Tap map to add
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
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
        initialAddress={reverseGeocodedAddress}
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
