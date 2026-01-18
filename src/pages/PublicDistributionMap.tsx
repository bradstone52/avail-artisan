import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, AlertCircle, Building, ArrowUpDown } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface PublicListing {
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

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

export default function PublicDistributionMap() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const token = searchParams.get("token");

  const [listings, setListings] = useState<PublicListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("size_sf");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  // Route guard: store token and prevent navigation away
  useEffect(() => {
    if (token) {
      sessionStorage.setItem("map_share_token", token);
    }
  }, [token]);

  // Block navigation to other routes
  useEffect(() => {
    const storedToken = sessionStorage.getItem("map_share_token");
    if (storedToken && !location.pathname.startsWith("/public/distribution-map")) {
      navigate(`/public/distribution-map?token=${storedToken}`, { replace: true });
    }
  }, [location, navigate]);

  // Fetch listings
  useEffect(() => {
    async function fetchListings() {
      if (!token) {
        setError("Invalid link - no token provided");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "validate-map-token",
          { body: { token } }
        );

        if (fnError) {
          throw new Error(fnError.message);
        }

        if (!data?.valid) {
          setError(data?.error || "Invalid or expired link");
          setLoading(false);
          return;
        }

        setListings(data.listings || []);
      } catch (err) {
        console.error("Failed to fetch listings:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchListings();
  }, [token]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || !MAPBOX_TOKEN || listings.length === 0) return;
    if (mapRef.current) return; // Already initialized

    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-114.0719, 51.0447], // Calgary default
      zoom: 10,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    mapRef.current = map;

    // Add markers after map loads
    map.on("load", () => {
      addMarkers();
      fitBoundsToMarkers();
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [listings]);

  const addMarkers = useCallback(() => {
    if (!mapRef.current) return;

    // Clear existing markers
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

  const selectListing = useCallback((listingId: string) => {
    setSelectedListingId(listingId);
    const listing = listings.find((l) => l.id === listingId);
    
    if (!listing || !mapRef.current) return;

    // Close existing popup
    if (popupRef.current) {
      popupRef.current.remove();
    }

    // Update marker styles
    markersRef.current.forEach((marker, id) => {
      const el = marker.getElement();
      if (id === listingId) {
        el.style.background = "hsl(48 97% 53%)"; // Yellow for selected
        el.style.transform = "translate(-1px, -1px) scale(1.15)";
        el.style.zIndex = "100";
      } else {
        el.style.background = "hsl(217 91% 53%)";
        el.style.transform = "";
        el.style.zIndex = "";
      }
    });

    if (listing.latitude && listing.longitude) {
      // Fly to location
      mapRef.current.flyTo({
        center: [listing.longitude, listing.latitude],
        zoom: 14,
        duration: 1000,
      });

      // Show popup
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
    }

    // Scroll table row into view
    const rowEl = document.getElementById(`listing-row-${listingId}`);
    if (rowEl) {
      rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [listings]);

  // Filter and sort listings
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Loading map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
      {/* Meta tags for SEO */}
      <meta name="robots" content="noindex, nofollow" />
      
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="border-b-2 border-foreground bg-card px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Building className="w-6 h-6 text-primary" />
            <span className="font-black text-lg tracking-tight">DISTRIBUTION MAP</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {listings.length} Properties
          </span>
        </header>

        {/* Main content */}
        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Table panel */}
          <div className="w-full lg:w-[45%] xl:w-[40%] border-r-0 lg:border-r-2 border-foreground flex flex-col">
            {/* Search */}
            <div className="p-3 border-b-2 border-foreground bg-card">
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
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-foreground text-background sticky top-0">
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
                    <th className="text-center p-3 font-bold uppercase text-xs tracking-wider">
                      Ceiling
                    </th>
                    <th className="text-center p-3 font-bold uppercase text-xs tracking-wider">
                      Docks
                    </th>
                    <th className="text-center p-3 font-bold uppercase text-xs tracking-wider">
                      Drive-In
                    </th>
                    <th className="text-center p-3 font-bold uppercase text-xs tracking-wider">
                      Map
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredListings.map((listing, idx) => (
                    <tr
                      key={listing.id}
                      id={`listing-row-${listing.id}`}
                      onClick={() => selectListing(listing.id)}
                      className={`
                        cursor-pointer transition-colors border-b border-border-subtle
                        ${idx % 2 === 1 ? "bg-muted/30" : "bg-card"}
                        ${selectedListingId === listing.id ? "!bg-secondary/30 ring-2 ring-inset ring-primary" : "hover:bg-muted/50"}
                      `}
                    >
                      <td className="p-3">
                        <div className="font-semibold text-foreground">
                          {listing.property_name || listing.display_address || listing.address}
                        </div>
                        <div className="text-xs text-muted-foreground">{listing.submarket}</div>
                      </td>
                      <td className="p-3 text-muted-foreground">{listing.city}</td>
                      <td className="p-3 text-right font-semibold">
                        {listing.size_sf?.toLocaleString() || "—"}
                      </td>
                      <td className="p-3 text-center">
                        {listing.clear_height_ft ? `${listing.clear_height_ft}'` : "—"}
                      </td>
                      <td className="p-3 text-center">{listing.dock_doors ?? "—"}</td>
                      <td className="p-3 text-center">{formatDriveIn(listing.drive_in_doors)}</td>
                      <td className="p-3 text-center">
                        {listing.latitude && listing.longitude ? (
                          <MapPin className="w-4 h-4 text-primary mx-auto" />
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
                  No listings match your search
                </div>
              )}
            </div>
          </div>

          {/* Map panel */}
          <div className="w-full lg:w-[55%] xl:w-[60%] h-[50vh] lg:h-auto relative">
            {!MAPBOX_TOKEN ? (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="text-center p-8">
                  <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Map not available</p>
                </div>
              </div>
            ) : (
              <div ref={mapContainerRef} className="absolute inset-0" />
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t-2 border-foreground bg-card px-4 py-2 text-center">
          <p className="text-xs text-muted-foreground">
            Information believed reliable but not guaranteed. © ClearView Commercial Realty Inc.
          </p>
        </footer>
      </div>

      {/* Custom popup styles */}
      <style>{`
        .mapboxgl-popup-content {
          border: 2px solid hsl(0 0% 7%) !important;
          border-radius: 6px !important;
          box-shadow: 4px 4px 0 hsl(0 0% 7%) !important;
          padding: 0 !important;
        }
        .mapboxgl-popup-close-button {
          font-size: 18px;
          padding: 4px 8px;
          color: hsl(0 0% 7%);
        }
        .mapboxgl-popup-close-button:hover {
          background: hsl(48 97% 53%);
        }
      `}</style>
    </>
  );
}
