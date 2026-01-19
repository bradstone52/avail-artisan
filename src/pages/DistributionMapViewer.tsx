import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/hooks/useOrg";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Loader2, AlertCircle } from "lucide-react";
import { DistributionMapView, MapListing } from "@/components/distribution/DistributionMapView";

export default function DistributionMapViewer() {
  const { user, loading: authLoading } = useAuth();
  const { org, loading: orgLoading } = useOrg();
  const navigate = useNavigate();

  const [listings, setListings] = useState<MapListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapToken, setMapToken] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  // Fetch listings for the user's org
  useEffect(() => {
    async function fetchData() {
      if (!user || !org) return;

      try {
        setLoading(true);

        // Fetch listings for this org
        const { data: listingsData, error: listingsError } = await supabase
          .from("listings")
          .select(`
            id,
            listing_id,
            address,
            display_address,
            property_name,
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
          .eq("include_in_issue", true)
          .order("size_sf", { ascending: false });

        if (listingsError) {
          console.error("[DistributionMapViewer] Listings fetch error:", listingsError);
          throw new Error(listingsError.message);
        }

        setListings(listingsData || []);
        console.log(`[DistributionMapViewer] Loaded ${listingsData?.length || 0} listings`);

        // Fetch Google Maps API key via authenticated endpoint
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke("get-google-maps-token", {
          body: { authenticated: true }
        });

        if (tokenError) {
          console.error("[DistributionMapViewer] Google Maps API key fetch error:", tokenError);
          setMapError("Failed to load map configuration");
        } else if (tokenData?.apiKey) {
          console.log("[DistributionMapViewer] Google Maps API key received");
          setMapToken(tokenData.apiKey);
        } else {
          setMapError("Map API key not available");
        }
      } catch (err) {
        console.error("[DistributionMapViewer] Failed to fetch data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    if (!orgLoading) {
      fetchData();
    }
  }, [user, org, orgLoading]);

  // Generate public share link
  const handleCopyPublicLink = async () => {
    if (!org || !user) return;

    setGeneratingLink(true);
    try {
      // Create a share link for this org
      const { data: shareLink, error: shareError } = await supabase
        .from("share_links")
        .insert({
          created_by: user.id,
          org_id: org.id,
          report_type: "distribution",
          filters: {},
          is_active: true,
        })
        .select("token")
        .single();

      if (shareError) throw shareError;

      const publicUrl = `${window.location.origin}/public/distribution-map?token=${shareLink.token}`;
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Public map link copied to clipboard!");
    } catch (err) {
      console.error("Failed to create share link:", err);
      toast.error("Failed to generate public link");
    } finally {
      setGeneratingLink(false);
    }
  };

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
      title="DISTRIBUTION MAP VIEWER"
      listings={listings}
      mapToken={mapToken}
      mapError={mapError}
      headerContent={
        <Button
          onClick={handleCopyPublicLink}
          disabled={generatingLink}
          variant="outline"
          className="gap-2"
        >
          {generatingLink ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          Copy Public Map Link
        </Button>
      }
    />
  );
}
