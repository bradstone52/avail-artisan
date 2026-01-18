import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/hooks/useOrg";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search, MapPin, AlertCircle, Building, ArrowUpDown, Copy, ExternalLink, Loader2 } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { AppLayout } from "@/components/layout/AppLayout";

interface Listing {
  id: string;
  listing_id: string;
  address: string;
  display_address: string | null;
  property_name: string | null;
  city: string;
  submarket: string;
  size_sf: number;
  clear_height_ft: number | null;
  dock_doors: number | null;
  drive_in_doors: number | null;
  availability_date: string | null;
  latitude: number | null;
  longitude: number | null;
}

type SortField = "address" | "city" | "size_sf" | "submarket";
type SortDirection = "asc" | "desc";

export default function DistributionMapViewer() {
  const { user, loading: authLoading } = useAuth();
  const { org, loading: orgLoading } = useOrg();
  const navigate = useNavigate();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapToken, setMapToken] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("size_sf");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

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

        // Fetch Mapbox token via authenticated endpoint
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke("get-mapbox-token", {
          body: { authenticated: true }
        });

        if (tokenError) {
          console.error("[DistributionMapViewer] Mapbox token fetch error:", tokenError);
          setMapError("Failed to load map configuration");
        } else if (tokenData?.token) {
          console.log("[DistributionMapViewer] Mapbox token received");
          setMapToken(tokenData.token);
        } else {
          setMapError("Map token not available");
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

  // Add markers function
  const addMarkers = useCallback(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    listings.forEach((listing) => {
      if (listing.latitude && listing.longitude) {
        const el = document.createElement("div");
        el.className = "map-marker";
        el.style.cssText = `
          width: 32px;
          height: 32px;
          background: hsl(217 91% 53%);
          border: 3px solid hsl(0 0% 7%);
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 3px 3px 0 hsl(0 0% 7%);
          transition: transform 0.15s, box-shadow 0.15s;
        `;
        el.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`;

        const marker = new mapboxgl.Marker(el)
          .setLngLat([listing.longitude, listing.latitude])
          .addTo(mapRef.current!);

        el.addEventListener("click", () => {
          selectListing(listing.id);
        });

        el.addEventListener("mouseenter", () => {
          el.style.transform = "translate(-1px, -1px) scale(1.1)";
        });
        el.addEventListener("mouseleave", () => {
          if (selectedListingId !== listing.id) {
            el.style.transform = "";
          }
        });

        markersRef.current.set(listing.id, marker);
      }
    });
  }, [listings, selectedListingId]);

  // Fit bounds function
  const fitBoundsToMarkers = useCallback(() => {
    if (!mapRef.current) return;

    const bounds = new mapboxgl.LngLatBounds();
    let hasCoords = false;

    listings.forEach((listing) => {
      if (listing.latitude && listing.longitude) {
        bounds.extend([listing.longitude, listing.latitude]);
        hasCoords = true;
      }
    });

    if (hasCoords) {
      mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 12 });
    }
  }, [listings]);

  // Select listing function
  const selectListing = useCallback((listingId: string) => {
    setSelectedListingId(listingId);
    const listing = listings.find((l) => l.id === listingId);
    
    if (!listing || !mapRef.current) return;

    if (popupRef.current) {
      popupRef.current.remove();
    }

    markersRef.current.forEach((marker, id) => {
      const el = marker.getElement();
      if (id === listingId) {
        el.style.background = "hsl(48 97% 53%)";
        el.style.transform = "translate(-1px, -1px) scale(1.15)";
        el.style.zIndex = "100";
      } else {
        el.style.background = "hsl(217 91% 53%)";
        el.style.transform = "";
        el.style.zIndex = "";
      }
    });

    if (listing.latitude && listing.longitude) {
      mapRef.current.resize();
      
      mapRef.current.flyTo({
        center: [listing.longitude, listing.latitude],
        zoom: 14,
        duration: 1000,
      });

      const driveIn = listing.drive_in_doors === 0 || listing.drive_in_doors == null 
        ? "—" 
        : String(listing.drive_in_doors);

      popupRef.current = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: false,
        offset: 25,
        className: "brutalist-popup",
      })
        .setLngLat([listing.longitude, listing.latitude])
        .setHTML(`
          <div style="font-family: Inter, sans-serif; padding: 8px;">
            <div style="font-weight: 800; font-size: 14px; color: #111; margin-bottom: 4px;">
              ${listing.property_name || listing.display_address || listing.address}
            </div>
            <div style="font-size: 12px; color: #555; margin-bottom: 8px;">
              ${listing.city} · ${listing.submarket}
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px;">
              <div><strong>${listing.size_sf?.toLocaleString() || "—"}</strong> SF</div>
              <div><strong>${listing.clear_height_ft || "—"}</strong>' Clear</div>
              <div><strong>${listing.dock_doors || "—"}</strong> Docks</div>
              <div><strong>${driveIn}</strong> Drive-In</div>
            </div>
          </div>
        `)
        .addTo(mapRef.current);
    } else {
      toast.info("No coordinates for this listing yet");
    }

    const rowEl = document.getElementById(`listing-row-${listingId}`);
    if (rowEl) {
      rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [listings]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || !mapToken) return;
    if (mapRef.current) return;

    try {
      mapboxgl.accessToken = mapToken;
      
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [-114.0719, 51.0447],
        zoom: 10,
      });

      map.addControl(new mapboxgl.NavigationControl(), "top-right");
      mapRef.current = map;

      map.on("load", () => {
        addMarkers();
        fitBoundsToMarkers();
        setTimeout(() => map.resize(), 100);
      });

      map.on("error", (e) => {
        console.error("[DistributionMapViewer] Mapbox error:", e?.error || e);
        setMapError("Failed to load map");
      });

      if (mapContainerRef.current) {
        resizeObserverRef.current = new ResizeObserver(() => {
          if (mapRef.current) mapRef.current.resize();
        });
        resizeObserverRef.current.observe(mapContainerRef.current);
      }

      const handleResize = () => {
        if (mapRef.current) mapRef.current.resize();
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
        map.remove();
        mapRef.current = null;
      };
    } catch (err) {
      console.error("[DistributionMapViewer] Map init failed:", err);
      setMapError("Failed to initialize map");
    }
  }, [mapToken, addMarkers, fitBoundsToMarkers]);

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

  // Filter and sort
  const filteredListings = listings
    .filter((l) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        l.address?.toLowerCase().includes(q) ||
        l.property_name?.toLowerCase().includes(q) ||
        l.city?.toLowerCase().includes(q) ||
        l.submarket?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let aVal: string | number = a[sortField] ?? "";
      let bVal: string | number = b[sortField] ?? "";
      
      if (sortField === "size_sf") {
        aVal = a.size_sf || 0;
        bVal = b.size_sf || 0;
      }
      
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      
      return sortDirection === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const formatDriveIn = (val: number | null): string => {
    if (val === null || val === 0) return "—";
    return String(val);
  };

  const geocodedCount = listings.filter(l => l.latitude && l.longitude).length;

  if (authLoading || orgLoading) {
    return (
      <AppLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading listings...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="h-full flex items-center justify-center p-4">
          <div className="brutalist-card p-8 max-w-md text-center">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-black mb-2">Error</h1>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <header className="shrink-0 border-b-2 border-foreground bg-card px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Building className="w-6 h-6 text-primary" />
              <span className="font-black text-lg tracking-tight">DISTRIBUTION MAP VIEWER</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {listings.length} Properties · {geocodedCount} Geocoded
            </span>
          </div>
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
        </header>

        {/* Main content */}
        <main className="flex-1 min-h-0 flex overflow-hidden">
          {/* Left panel */}
          <div className="w-[520px] max-w-[55vw] min-w-[420px] h-full flex flex-col border-r-2 border-foreground">
            {/* Search */}
            <div className="shrink-0 p-3 border-b-2 border-foreground bg-card">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search address, city, submarket..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-foreground text-background sticky top-0 z-10">
                  <tr>
                    <th className="text-left p-3">
                      <button
                        onClick={() => toggleSort("address")}
                        className="flex items-center gap-1 font-bold uppercase text-xs tracking-wider hover:text-secondary"
                      >
                        Property
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-left p-3">
                      <button
                        onClick={() => toggleSort("city")}
                        className="flex items-center gap-1 font-bold uppercase text-xs tracking-wider hover:text-secondary"
                      >
                        City
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-right p-3">
                      <button
                        onClick={() => toggleSort("size_sf")}
                        className="flex items-center gap-1 justify-end font-bold uppercase text-xs tracking-wider hover:text-secondary"
                      >
                        Size (SF)
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-center p-3 w-10">
                      <MapPin className="w-4 h-4 mx-auto" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredListings.map((listing) => (
                    <tr
                      key={listing.id}
                      id={`listing-row-${listing.id}`}
                      onClick={() => selectListing(listing.id)}
                      className={`border-b border-border cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedListingId === listing.id ? "bg-primary/10" : ""
                      }`}
                    >
                      <td className="p-3">
                        <div className="font-semibold truncate max-w-[180px]">
                          {listing.property_name || listing.display_address || listing.address}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {listing.submarket}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{listing.city}</td>
                      <td className="p-3 text-right font-mono font-semibold">
                        {listing.size_sf?.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        {listing.latitude && listing.longitude ? (
                          <MapPin className="w-4 h-4 text-green-600 mx-auto" />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredListings.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  {searchQuery ? "No listings match your search." : "No active distribution listings found."}
                </div>
              )}
            </div>
          </div>

          {/* Right panel - Map */}
          <div className="flex-1 min-w-0 h-full overflow-hidden relative">
            {mapError ? (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                <div className="text-center p-6">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">{mapError}</p>
                </div>
              </div>
            ) : !mapToken ? (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                  <p className="text-muted-foreground">Loading map...</p>
                </div>
              </div>
            ) : null}
            <div ref={mapContainerRef} className="h-full w-full" />
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
