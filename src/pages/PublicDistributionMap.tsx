import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle } from "lucide-react";
import { DistributionMapView, MapListing } from "@/components/distribution/DistributionMapView";

export default function PublicDistributionMap() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const token = searchParams.get("token");

  const [listings, setListings] = useState<MapListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapToken, setMapToken] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // Route guard: store token and prevent navigation away
  useEffect(() => {
    if (token) {
      sessionStorage.setItem("map_share_token", token);
    }
  }, [token]);

  // Block navigation to other routes
  useEffect(() => {
    const storedToken = sessionStorage.getItem("map_share_token");
    const isValidMapPath = location.pathname.includes("/public/distribution-map");
    if (storedToken && !isValidMapPath) {
      navigate(`/public/distribution-map?token=${storedToken}`, { replace: true });
    }
  }, [location, navigate]);

  // Fetch listings and Mapbox token
  useEffect(() => {
    async function fetchData() {
      if (!token) {
        setError("Invalid link - no token provided");
        setLoading(false);
        return;
      }

      try {
        // Fetch listings and Mapbox token in parallel
        const [listingsResult, tokenResult] = await Promise.all([
          supabase.functions.invoke("validate-map-token", { body: { token } }),
          supabase.functions.invoke("get-mapbox-token", { body: { token } })
        ]);

        // Handle listings response
        if (listingsResult.error) {
          console.error("[PublicDistributionMap] Listings fetch error:", listingsResult.error);
          throw new Error(listingsResult.error.message);
        }

        if (!listingsResult.data?.valid) {
          setError(listingsResult.data?.error || "Invalid or expired link");
          setLoading(false);
          return;
        }

        // Deduplicate listings by listing_id client-side
        const rawListings = listingsResult.data.listings || [];
        const seenIds = new Set<string>();
        const uniqueListings = rawListings.filter((l: MapListing) => {
          if (seenIds.has(l.listing_id)) return false;
          seenIds.add(l.listing_id);
          return true;
        });

        setListings(uniqueListings);
        console.log(`[PublicDistributionMap] Loaded ${uniqueListings.length} unique listings (from ${rawListings.length} raw)`);

        // Handle Mapbox token response
        if (tokenResult.error) {
          console.error("[PublicDistributionMap] Mapbox token fetch error:", tokenResult.error);
          setMapError("Failed to load map configuration");
        } else if (tokenResult.data?.token) {
          console.log("[PublicDistributionMap] Mapbox token received successfully");
          setMapToken(tokenResult.data.token);
        } else if (tokenResult.data?.error) {
          console.error("[PublicDistributionMap] Mapbox token error:", tokenResult.data.error);
          setMapError(tokenResult.data.error);
        } else {
          console.error("[PublicDistributionMap] No Mapbox token in response");
          setMapError("Map token not available");
        }
      } catch (err) {
        console.error("[PublicDistributionMap] Failed to fetch data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center overflow-hidden">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Loading map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-background flex items-center justify-center p-4 overflow-hidden">
        <div className="brutalist-card p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-black mb-2">Invalid Link</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      <DistributionMapView
        title="DISTRIBUTION MAP"
        listings={listings}
        mapToken={mapToken}
        mapError={mapError}
      />
    </>
  );
}
