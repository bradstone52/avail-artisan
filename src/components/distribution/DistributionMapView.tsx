import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search, MapPin, AlertCircle, Building, ArrowUpDown } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export interface MapListing {
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

// Helper to validate coordinates
function isValidCoord(lat: number | null, lng: number | null): boolean {
  if (lat === null || lng === null) return false;
  const la = Number(lat);
  const ln = Number(lng);
  return Number.isFinite(la) && Number.isFinite(ln) && la !== 0 && ln !== 0;
}

interface DistributionMapViewProps {
  title: string;
  listings: MapListing[];
  mapToken: string | null;
  mapError: string | null;
  headerContent?: React.ReactNode;
}

export function DistributionMapView({
  title,
  listings,
  mapToken,
  mapError,
  headerContent,
}: DistributionMapViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("size_sf");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [hoveredListingId, setHoveredListingId] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Create a filtered list of ONLY mappable listings (valid coordinates)
  const mappableListings = useMemo(() => {
    const seen = new Set<string>();
    return listings.filter((l) => {
      // Must have valid coordinates
      if (!isValidCoord(l.latitude, l.longitude)) return false;
      // Must have a listing_id and be unique
      if (!l.listing_id || seen.has(l.listing_id)) return false;
      seen.add(l.listing_id);
      return true;
    });
  }, [listings]);

  // Count of non-mappable listings
  const unmappedCount = listings.length - mappableListings.length;

  // Add markers function
  const addMarkers = useCallback(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    mappableListings.forEach((listing) => {
      const el = document.createElement("div");
      el.className = "map-marker";
      el.dataset.listingId = listing.id;
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
        transition: background 0.15s, box-shadow 0.15s;
      `;
      el.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`;

      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([listing.longitude!, listing.latitude!])
        .addTo(mapRef.current!);

      el.addEventListener("click", () => {
        selectListing(listing.id);
      });

      el.addEventListener("mouseenter", () => {
        if (selectedListingId !== listing.id) {
          el.style.background = "hsl(142 71% 45%)"; // Green on hover
          el.style.boxShadow = "4px 4px 0 hsl(0 0% 7%)";
        }
      });
      el.addEventListener("mouseleave", () => {
        if (selectedListingId !== listing.id) {
          el.style.background = "hsl(217 91% 53%)";
          el.style.boxShadow = "3px 3px 0 hsl(0 0% 7%)";
        }
      });

      markersRef.current.set(listing.id, marker);
    });
  }, [mappableListings, selectedListingId]);

  // Fit bounds function
  const fitBoundsToMarkers = useCallback(() => {
    if (!mapRef.current || mappableListings.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();

    mappableListings.forEach((listing) => {
      bounds.extend([listing.longitude!, listing.latitude!]);
    });

    mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 12 });
  }, [mappableListings]);

  // Select listing function - reads coordinates from the item directly
  const selectListing = useCallback((listingId: string) => {
    setSelectedListingId(listingId);
    const listing = mappableListings.find((l) => l.id === listingId);

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
        el.style.boxShadow = "4px 4px 0 hsl(0 0% 7%)";
        el.style.zIndex = "100";
      } else {
        el.style.background = "hsl(217 91% 53%)";
        el.style.boxShadow = "3px 3px 0 hsl(0 0% 7%)";
        el.style.zIndex = "";
      }
    });

    // All items in mappableListings have valid coords - no need to check again
    const lat = Number(listing.latitude);
    const lng = Number(listing.longitude);

    // Resize map before flying
    mapRef.current.resize();

    // Fly to location
    mapRef.current.flyTo({
      center: [lng, lat],
      zoom: 13,
      essential: true,
      duration: 1000,
    });

    // Show popup
    const driveIn =
      listing.drive_in_doors === 0 || listing.drive_in_doors == null
        ? "—"
        : String(listing.drive_in_doors);

    popupRef.current = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
      offset: 25,
      className: "brutalist-popup",
    })
      .setLngLat([lng, lat])
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

    // Scroll table row into view
    const rowEl = document.getElementById(`listing-row-${listingId}`);
    if (rowEl) {
      rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [mappableListings]);

  // Initialize map when we have the token
  useEffect(() => {
    if (!mapContainerRef.current || !mapToken) {
      return;
    }
    if (mapRef.current) {
      return;
    }

    try {
      mapboxgl.accessToken = mapToken;

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
        setTimeout(() => map.resize(), 100);
      });

      // Handle map errors
      map.on("error", (e) => {
        console.error("[DistributionMapView] Mapbox error:", e?.error || e);
      });

      // Setup ResizeObserver for the map container
      if (mapContainerRef.current) {
        resizeObserverRef.current = new ResizeObserver(() => {
          if (mapRef.current) {
            mapRef.current.resize();
          }
        });
        resizeObserverRef.current.observe(mapContainerRef.current);
      }

      // Window resize handler
      const handleResize = () => {
        if (mapRef.current) {
          mapRef.current.resize();
        }
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
        }
        map.remove();
        mapRef.current = null;
      };
    } catch (err) {
      console.error("[DistributionMapView] Failed to initialize map:", err);
    }
  }, [mapToken, addMarkers, fitBoundsToMarkers]);

  // Re-add markers when listings change
  useEffect(() => {
    if (mapRef.current && mapToken) {
      addMarkers();
      fitBoundsToMarkers();
    }
  }, [mappableListings, mapToken, addMarkers, fitBoundsToMarkers]);

  // Filter and sort - uses ONLY mappableListings
  const filteredListings = useMemo(() => {
    return mappableListings
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
  }, [mappableListings, searchQuery, sortField, sortDirection]);

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

  // Highlight marker when hovering over table row
  const handleRowHover = useCallback((listingId: string | null) => {
    setHoveredListingId(listingId);
    
    markersRef.current.forEach((marker, id) => {
      const el = marker.getElement();
      if (id === selectedListingId) {
        // Keep selected style
        el.style.background = "hsl(48 97% 53%)";
        el.style.boxShadow = "4px 4px 0 hsl(0 0% 7%)";
        el.style.zIndex = "100";
      } else if (id === listingId) {
        // Hovered style - green
        el.style.background = "hsl(142 71% 45%)";
        el.style.boxShadow = "4px 4px 0 hsl(0 0% 7%)";
        el.style.zIndex = "50";
      } else {
        // Default style
        el.style.background = "hsl(217 91% 53%)";
        el.style.boxShadow = "3px 3px 0 hsl(0 0% 7%)";
        el.style.zIndex = "";
      }
    });
  }, [selectedListingId]);

  return (
    <div className="h-[100dvh] w-full overflow-hidden flex flex-col bg-background">
      {/* Header - fixed height, no grow */}
      <header className="shrink-0 border-b-2 border-foreground bg-card px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Building className="w-6 h-6 text-primary" />
            <span className="font-black text-lg tracking-tight">{title}</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {mappableListings.length} Mapped
            {unmappedCount > 0 && (
              <span className="ml-1 text-warning">
                · {unmappedCount} not geocoded
              </span>
            )}
          </span>
        </div>
        {headerContent}
      </header>

      {/* Main content - flex-1 min-h-0 is critical to prevent overflow */}
      <main className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left panel - fixed width, internal scroll only */}
        <div className="w-[600px] max-w-[60vw] min-w-[400px] h-full flex flex-col border-r-2 border-foreground">
          {/* Search - sticky top */}
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

          {/* Table container - this is the ONLY scrollable area */}
          <div className="flex-1 min-h-0 overflow-y-auto">
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
                  <th className="text-center p-3 font-bold uppercase text-xs tracking-wider">
                    Ceiling
                  </th>
                  <th className="text-center p-3 font-bold uppercase text-xs tracking-wider">
                    Docks
                  </th>
                  <th className="text-center p-3 font-bold uppercase text-xs tracking-wider">
                    D-In
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredListings.map((listing, idx) => (
                  <tr
                    key={listing.id}
                    id={`listing-row-${listing.id}`}
                    onClick={() => selectListing(listing.id)}
                    onMouseEnter={() => handleRowHover(listing.id)}
                    onMouseLeave={() => handleRowHover(null)}
                    className={`
                      cursor-pointer transition-colors border-b border-border-subtle
                      ${idx % 2 === 1 ? "bg-muted/30" : "bg-card"}
                      ${selectedListingId === listing.id ? "!bg-secondary/30 ring-2 ring-inset ring-primary" : "hover:bg-muted/50"}
                    `}
                  >
                    <td className="p-3">
                      <div className="font-semibold text-foreground truncate max-w-[180px]">
                        {listing.property_name || listing.display_address || listing.address}
                      </div>
                      <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {listing.submarket}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{listing.city}</td>
                    <td className="p-3 text-right font-semibold font-mono">
                      {listing.size_sf?.toLocaleString() || "—"}
                    </td>
                    <td className="p-3 text-center">
                      {listing.clear_height_ft ? `${listing.clear_height_ft}'` : "—"}
                    </td>
                    <td className="p-3 text-center">{listing.dock_doors ?? "—"}</td>
                    <td className="p-3 text-center">{formatDriveIn(listing.drive_in_doors)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredListings.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                {searchQuery
                  ? "No listings match your search"
                  : "No geocoded listings available"}
              </div>
            )}
          </div>
        </div>

        {/* Right panel - map fills remaining space */}
        <div className="flex-1 min-w-0 min-h-0 overflow-hidden relative">
          {mapError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center p-8 brutalist-card">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <p className="font-bold text-foreground mb-2">Map Error</p>
                <p className="text-sm text-muted-foreground">{mapError}</p>
              </div>
            </div>
          ) : !mapToken ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Loading map...</p>
              </div>
            </div>
          ) : (
            <div ref={mapContainerRef} className="h-full w-full" />
          )}
        </div>
      </main>

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
    </div>
  );
}
