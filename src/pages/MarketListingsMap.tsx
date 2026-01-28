import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/hooks/useOrg";
import { Loader2, AlertCircle } from "lucide-react";
import { DistributionMapView, MapListing } from "@/components/distribution/DistributionMapView";

export default function MarketListingsMap() {
  const { user, loading: authLoading } = useAuth();
  const { org, loading: orgLoading } = useOrg();
  const navigate = useNavigate();

  const [listings, setListings] = useState<MapListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapToken, setMapToken] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  // Fetch ALL market listings for the user's org
  useEffect(() => {
    async function fetchData() {
      if (!user || !org) return;

      try {
        setLoading(true);

        // Fetch ALL market listings (not just distribution warehouses)
        const { data: listingsData, error: listingsError } = await supabase
          .from("market_listings")
          .select(`
            id,
            listing_id,
            address,
            display_address,
            city,
            submarket,
            size_sf,
            clear_height_ft,
            dock_doors,
            drive_in_doors,
            availability_date,
            latitude,
            longitude
          `)
          .eq("org_id", org.id)
          .eq("status", "Active")
          .order("size_sf", { ascending: false });

        if (listingsError) {
          console.error("[MarketListingsMap] Listings fetch error:", listingsError);
          throw new Error(listingsError.message);
        }

        // Map to expected format
        const mappedListings: MapListing[] = (listingsData || []).map(ml => ({
          id: ml.id,
          listing_id: ml.listing_id,
          address: ml.address,
          display_address: ml.display_address,
          property_name: ml.display_address,
          city: ml.city,
          submarket: ml.submarket,
          size_sf: ml.size_sf,
          clear_height_ft: ml.clear_height_ft,
          dock_doors: ml.dock_doors,
          drive_in_doors: ml.drive_in_doors,
          availability_date: ml.availability_date,
          latitude: ml.latitude,
          longitude: ml.longitude,
        }));

        setListings(mappedListings);
        console.log(`[MarketListingsMap] Loaded ${mappedListings.length} market listings`);

        // Fetch Google Maps API key via authenticated endpoint
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke("get-google-maps-token", {
          body: { authenticated: true }
        });

        if (tokenError) {
          console.error("[MarketListingsMap] Google Maps API key fetch error:", tokenError);
          setMapError("Failed to load map configuration");
        } else if (tokenData?.apiKey) {
          console.log("[MarketListingsMap] Google Maps API key received");
          setMapToken(tokenData.apiKey);
        } else {
          setMapError("Map API key not available");
        }
      } catch (err) {
        console.error("[MarketListingsMap] Failed to fetch data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    if (!orgLoading) {
      fetchData();
    }
  }, [user, org, orgLoading]);

  if (authLoading || orgLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading listings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center p-4 bg-background">
        <div className="brutalist-card p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-black mb-2">Error</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <DistributionMapView
      title="MARKET LISTINGS MAP"
      listings={listings}
      mapToken={mapToken}
      mapError={mapError}
    />
  );
}
