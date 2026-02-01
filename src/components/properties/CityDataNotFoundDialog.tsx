import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Loader2, Search, AlertTriangle } from 'lucide-react';

interface CityDataNotFoundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: string;
  city: string;
  propertyId: string;
  onRetryWithAddress: (newAddress: string) => void;
}

interface NearbyAddress {
  address: string;
  formattedAddress: string;
}

export function CityDataNotFoundDialog({
  open,
  onOpenChange,
  address,
  city,
  propertyId,
  onRetryWithAddress,
}: CityDataNotFoundDialogProps) {
  const [loading, setLoading] = useState(false);
  const [nearbyAddresses, setNearbyAddresses] = useState<NearbyAddress[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch nearby addresses when dialog opens
  useEffect(() => {
    if (open && address && city.toLowerCase().includes('calgary')) {
      fetchNearbyAddresses();
    }
  }, [open, address, city]);

  const fetchNearbyAddresses = async () => {
    setLoading(true);
    setError(null);
    setNearbyAddresses([]);

    try {
      // Get Google Maps API token
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('get-google-maps-token', {
        body: { authenticated: true }
      });

      if (tokenError || !tokenData?.token) {
        throw new Error('Failed to get maps token');
      }

      // First, geocode the original address to get coordinates
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(`${address}, ${city}, AB, Canada`)}&key=${tokenData.token}`;
      const geocodeResp = await fetch(geocodeUrl);
      const geocodeData = await geocodeResp.json();

      if (geocodeData.status !== 'OK' || !geocodeData.results?.length) {
        setError('Could not locate this address on the map');
        return;
      }

      const location = geocodeData.results[0].geometry.location;
      
      // Use reverse geocoding with nearby radius to find alternative addresses
      // Try slight offsets in different directions to find nearby properties
      const offsets = [
        { lat: 0.0002, lng: 0 },      // ~20m north
        { lat: -0.0002, lng: 0 },     // ~20m south
        { lat: 0, lng: 0.0003 },      // ~20m east
        { lat: 0, lng: -0.0003 },     // ~20m west
        { lat: 0.0004, lng: 0 },      // ~40m north
        { lat: -0.0004, lng: 0 },     // ~40m south
      ];

      const suggestions: NearbyAddress[] = [];
      const seenAddresses = new Set<string>();
      seenAddresses.add(address.toLowerCase().replace(/\s+/g, ' ').trim());

      for (const offset of offsets) {
        if (suggestions.length >= 4) break;

        const reverseUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.lat + offset.lat},${location.lng + offset.lng}&key=${tokenData.token}&result_type=street_address`;
        const reverseResp = await fetch(reverseUrl);
        const reverseData = await reverseResp.json();

        if (reverseData.status === 'OK' && reverseData.results?.length) {
          for (const result of reverseData.results) {
            // Extract street address from formatted address
            const parts = result.formatted_address.split(',');
            const streetAddress = parts[0]?.trim();
            
            if (streetAddress && !seenAddresses.has(streetAddress.toLowerCase().replace(/\s+/g, ' ').trim())) {
              seenAddresses.add(streetAddress.toLowerCase().replace(/\s+/g, ' ').trim());
              suggestions.push({
                address: streetAddress,
                formattedAddress: result.formatted_address
              });
              
              if (suggestions.length >= 4) break;
            }
          }
        }
      }

      setNearbyAddresses(suggestions);
      
      if (suggestions.length === 0) {
        setError('No nearby addresses found. The property may use a different address format in City records.');
      }
    } catch (err: any) {
      console.error('Error fetching nearby addresses:', err);
      setError('Failed to search for nearby addresses');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAddress = (newAddress: string) => {
    onRetryWithAddress(newAddress);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Address Not Found in City Records
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                The City of Calgary database doesn't have a record for:
              </p>
              <div className="bg-muted rounded-lg p-3 flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">{address}</p>
                  <p className="text-sm text-muted-foreground">{city}</p>
                </div>
              </div>
              <p className="text-sm">
                This could be due to address format differences. Below are nearby addresses that might match:
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-2">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Searching nearby addresses...</span>
            </div>
          ) : error ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{error}</p>
            </div>
          ) : nearbyAddresses.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium mb-3">Suggested addresses:</p>
              {nearbyAddresses.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectAddress(item.address)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <p className="font-medium">{item.address}</p>
                  <p className="text-xs text-muted-foreground">{item.formattedAddress}</p>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button variant="secondary" onClick={fetchNearbyAddresses} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Search Again
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
