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
      const { data, error } = await supabase.functions.invoke('suggest-nearby-addresses', {
        body: { address, city, maxSuggestions: 4 },
      });

      if (error) throw error;

      const suggestions: NearbyAddress[] = Array.isArray(data?.suggestions) ? data.suggestions : [];
      setNearbyAddresses(suggestions);

      if (!suggestions.length) {
        setError(
          data?.reason === 'geocode_not_found'
            ? 'Could not locate this address on the map'
            : 'No nearby addresses found. The property may use a different address format in City records.'
        );
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
