import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, AlertCircle, Building, ArrowUpDown, ZoomOut } from "lucide-react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

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
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Keep latest selection in a ref so marker event handlers don't need to
  // capture selectedListingId (which would force marker rebuilds and re-fitBounds).
  const selectedListingIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedListingIdRef.current = selectedListingId;
  }, [selectedListingId]);

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

  // Create marker element
  const createMarkerElement = useCallback((isSelected: boolean, isHovered: boolean) => {
    const el = document.createElement("div");
    let bgColor = "hsl(217 91% 53%)"; // Default blue
    let shadowSize = "3px";
    
    if (isSelected) {
      bgColor = "hsl(48 97% 53%)"; // Yellow for selected
      shadowSize = "4px";
    } else if (isHovered) {
      bgColor = "hsl(142 71% 45%)"; // Green for hovered
      shadowSize = "4px";
    }
    
    el.innerHTML = `
      <div style="
        width: 32px;
        height: 32px;
        background: ${bgColor};
        border: 3px solid hsl(0 0% 7%);
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: ${shadowSize} ${shadowSize} 0 hsl(0 0% 7%);
        transition: background 0.15s, box-shadow 0.15s;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    `;
    return el;
  }, []);

  // Update marker style
  const updateMarkerStyle = useCallback((listingId: string, isSelected: boolean, isHovered: boolean) => {
    const marker = markersRef.current.get(listingId);
    if (!marker) return;
    
    const el = marker.content as HTMLElement;
    if (!el) return;
    
    const inner = el.querySelector("div") as HTMLElement;
    if (!inner) return;
    
    let bgColor = "hsl(217 91% 53%)";
    let shadowSize = "3px";
    let zIndex = 1;
    
    if (isSelected) {
      bgColor = "hsl(48 97% 53%)";
      shadowSize = "4px";
      zIndex = 100;
    } else if (isHovered) {
      bgColor = "hsl(142 71% 45%)";
      shadowSize = "4px";
      zIndex = 50;
    }
    
    inner.style.background = bgColor;
    inner.style.boxShadow = `${shadowSize} ${shadowSize} 0 hsl(0 0% 7%)`;
    marker.zIndex = zIndex;
  }, []);

  // Select listing function
  const selectListing = useCallback(
    (listingId: string) => {
      const listing = mappableListings.find((l) => l.id === listingId);

      if (!listing || !mapRef.current) return;

      // Update state + ref
      selectedListingIdRef.current = listingId;
      setSelectedListingId(listingId);

      // Close existing info window
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }

      // Update marker styles - HIDE non-selected markers, show only selected
      markersRef.current.forEach((marker, id) => {
        const el = marker.content as HTMLElement;
        if (id === listingId) {
          el.style.display = "flex";
          updateMarkerStyle(id, true, false);
        } else {
          el.style.display = "none";
        }
      });

      const lat = Number(listing.latitude);
      const lng = Number(listing.longitude);

      // Pan and zoom to location
      mapRef.current.panTo({ lat, lng });
      mapRef.current.setZoom(16);

      // Show info window
      const driveIn =
        listing.drive_in_doors === 0 || listing.drive_in_doors == null
          ? "—"
          : String(listing.drive_in_doors);

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="font-family: Inter, sans-serif; padding: 16px 18px; max-width: 340px;">
            <div style="font-weight: 900; font-size: 17px; color: #111; margin-bottom: 8px; line-height: 1.25;">
              ${listing.property_name || listing.display_address || listing.address}
            </div>
            <div style="font-size: 14px; color: #555; margin-bottom: 12px; line-height: 1.35;">
              ${listing.city} · ${listing.submarket}
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px 12px; font-size: 14px;">
              <div><strong>${listing.size_sf?.toLocaleString() || "—"}</strong> SF</div>
              <div><strong>${listing.clear_height_ft || "—"}</strong>' Clear</div>
              <div><strong>${listing.dock_doors || "—"}</strong> Docks</div>
              <div><strong>${driveIn}</strong> Drive-In</div>
            </div>
          </div>
        `,
        pixelOffset: new google.maps.Size(0, -16),
      });

      const marker = markersRef.current.get(listingId);
      if (marker) {
        infoWindow.open(mapRef.current, marker);
      }
      infoWindowRef.current = infoWindow;

      // Scroll table row into view
      const rowEl = document.getElementById(`listing-row-${listingId}`);
      if (rowEl) {
        rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    [mappableListings, updateMarkerStyle]
  );

  // Add markers function
  const addMarkers = useCallback(async () => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => {
      marker.map = null;
    });
    markersRef.current.clear();

    // Import AdvancedMarkerElement
    const { AdvancedMarkerElement } = await importLibrary("marker") as google.maps.MarkerLibrary;

    mappableListings.forEach((listing) => {
      const el = createMarkerElement(false, false);

      const marker = new AdvancedMarkerElement({
        map: mapRef.current!,
        position: { lat: listing.latitude!, lng: listing.longitude! },
        content: el,
      });

      marker.addListener("click", () => {
        selectListing(listing.id);
      });

      el.addEventListener("mouseenter", () => {
        if (selectedListingIdRef.current !== listing.id) {
          updateMarkerStyle(listing.id, false, true);
        }
      });
      el.addEventListener("mouseleave", () => {
        if (selectedListingIdRef.current !== listing.id) {
          updateMarkerStyle(listing.id, false, false);
        }
      });

      markersRef.current.set(listing.id, marker);
    });
  }, [mappableListings, selectListing, createMarkerElement, updateMarkerStyle]);

  // Fit bounds function
  const fitBoundsToMarkers = useCallback(() => {
    if (!mapRef.current || mappableListings.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    mappableListings.forEach((listing) => {
      bounds.extend({ lat: listing.latitude!, lng: listing.longitude! });
    });

    mapRef.current.fitBounds(bounds, 60);
    
    // Limit max zoom
    const listener = google.maps.event.addListener(mapRef.current, "idle", () => {
      const zoom = mapRef.current?.getZoom();
      if (zoom && zoom > 12) {
        mapRef.current?.setZoom(12);
      }
      google.maps.event.removeListener(listener);
    });
  }, [mappableListings]);

  // Initialize map when we have the token
  useEffect(() => {
    if (!mapContainerRef.current || !mapToken) {
      return;
    }
    if (mapRef.current) {
      return;
    }

    const initMap = async () => {
      try {
        // Set API options (only needs to be done once)
        setOptions({
          key: mapToken,
          v: "weekly",
        });

        // Use importLibrary to load the maps library
        const { Map } = await importLibrary("maps") as google.maps.MapsLibrary;

        if (!mapContainerRef.current) return;

        const map = new Map(mapContainerRef.current, {
          center: { lat: 51.0447, lng: -114.0719 }, // Calgary default
          zoom: 10,
          mapTypeId: "hybrid", // Satellite with labels
          mapId: "distribution-map", // Required for AdvancedMarkerElement
          gestureHandling: "greedy",
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });

        mapRef.current = map;

        // Add markers after map loads
        google.maps.event.addListenerOnce(map, "tilesloaded", () => {
          addMarkers();
          fitBoundsToMarkers();
        });

        // Setup ResizeObserver for the map container
        if (mapContainerRef.current) {
          resizeObserverRef.current = new ResizeObserver(() => {
            if (mapRef.current) {
              google.maps.event.trigger(mapRef.current, "resize");
            }
          });
          resizeObserverRef.current.observe(mapContainerRef.current);
        }

        // Window resize handler
        const handleResize = () => {
          if (mapRef.current) {
            google.maps.event.trigger(mapRef.current, "resize");
          }
        };
        window.addEventListener("resize", handleResize);

        return () => {
          window.removeEventListener("resize", handleResize);
          if (resizeObserverRef.current) {
            resizeObserverRef.current.disconnect();
          }
        };
      } catch (err) {
        console.error("[DistributionMapView] Failed to initialize Google Maps:", err);
      }
    };

    initMap();
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
      const el = marker.content as HTMLElement;
      if (!el) return;
      
      if (id === selectedListingId) {
        // Keep selected style
        updateMarkerStyle(id, true, false);
      } else if (id === listingId) {
        // Hovered style
        updateMarkerStyle(id, false, true);
      } else {
        // Default style
        updateMarkerStyle(id, false, false);
      }
    });
  }, [selectedListingId, updateMarkerStyle]);

  // Zoom out to show all markers
  const handleZoomOut = useCallback(() => {
    selectedListingIdRef.current = null;
    setSelectedListingId(null);

    // Reset all markers to default style AND show them again
    markersRef.current.forEach((marker, id) => {
      const el = marker.content as HTMLElement;
      if (el) {
        el.style.display = "flex";
      }
      updateMarkerStyle(id, false, false);
    });

    // Close info window
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
      infoWindowRef.current = null;
    }

    // Fit bounds to all markers
    fitBoundsToMarkers();
  }, [fitBoundsToMarkers, updateMarkerStyle]);

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
                    className={`cursor-pointer border-b border-border transition-colors ${
                      selectedListingId === listing.id
                        ? "bg-primary/20"
                        : hoveredListingId === listing.id
                        ? "bg-[hsl(48_97%_53%/0.3)]"
                        : idx % 2 === 0
                        ? "bg-card"
                        : "bg-background"
                    }`}
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
                    <td className="p-3 text-right font-mono font-medium">
                      {listing.size_sf?.toLocaleString() || "—"}
                    </td>
                    <td className="p-3 text-center text-muted-foreground">
                      {listing.clear_height_ft ? `${listing.clear_height_ft}'` : "—"}
                    </td>
                    <td className="p-3 text-center text-muted-foreground">
                      {listing.dock_doors || "—"}
                    </td>
                    <td className="p-3 text-center text-muted-foreground">
                      {formatDriveIn(listing.drive_in_doors)}
                    </td>
                  </tr>
                ))}
                {filteredListings.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No listings found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right panel - map takes remaining space */}
        <div className="flex-1 relative bg-muted">
          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <p className="font-semibold text-destructive">{mapError}</p>
              </div>
            </div>
          )}

          {!mapToken && !mapError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Loading map...</p>
              </div>
            </div>
          )}

          <div
            ref={mapContainerRef}
            className="absolute inset-0"
            style={{ visibility: mapToken ? "visible" : "hidden" }}
          />

          {/* Zoom out button - appears when a listing is selected */}
          {selectedListingId && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleZoomOut}
              className="absolute top-4 left-4 shadow-lg z-10"
            >
              <ZoomOut className="w-4 h-4 mr-2" />
              View All
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
