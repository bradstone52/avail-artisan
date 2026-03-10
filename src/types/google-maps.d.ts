// Global Google Maps type declarations
// These mirror @types/google.maps but are declared in a way compatible with
// moduleDetection: "force" by using `export {}` to make this a module,
// then using `declare global` to hoist to global scope.

export {};

declare global {
  namespace google {
    namespace maps {
      class Map {
        constructor(mapDiv: HTMLElement, opts?: MapOptions);
        fitBounds(bounds: LatLngBounds | LatLngBoundsLiteral, padding?: number | Padding): void;
        panTo(latLng: LatLng | LatLngLiteral): void;
        setCenter(latlng: LatLng | LatLngLiteral): void;
        setZoom(zoom: number): void;
        getZoom(): number | undefined;
        getCenter(): LatLng | undefined;
        getBounds(): LatLngBounds | undefined;
        addListener(eventName: string, handler: (...args: any[]) => void): MapsEventListener;
      }

      interface MapOptions {
        center?: LatLng | LatLngLiteral;
        zoom?: number;
        mapId?: string;
        mapTypeId?: string;
        disableDefaultUI?: boolean;
        zoomControl?: boolean;
        streetViewControl?: boolean;
        fullscreenControl?: boolean;
        gestureHandling?: string;
        restriction?: MapRestriction;
      }

      interface MapRestriction {
        latLngBounds: LatLngBounds | LatLngBoundsLiteral;
        strictBounds?: boolean;
      }

      interface Padding {
        top: number;
        right: number;
        bottom: number;
        left: number;
      }

      class LatLng {
        constructor(lat: number, lng: number);
        lat(): number;
        lng(): number;
      }

      interface LatLngLiteral {
        lat: number;
        lng: number;
      }

      class LatLngBounds {
        constructor(sw?: LatLng | LatLngLiteral, ne?: LatLng | LatLngLiteral);
        extend(point: LatLng | LatLngLiteral): LatLngBounds;
        isEmpty(): boolean;
      }

      interface LatLngBoundsLiteral {
        east: number;
        north: number;
        south: number;
        west: number;
      }

      class InfoWindow {
        constructor(opts?: InfoWindowOptions);
        open(map?: Map, anchor?: any): void;
        close(): void;
        setContent(content: string | HTMLElement): void;
      }

      interface InfoWindowOptions {
        content?: string | HTMLElement;
        pixelOffset?: Size;
        position?: LatLng | LatLngLiteral;
      }

      class Size {
        constructor(width: number, height: number, widthUnit?: string, heightUnit?: string);
        width: number;
        height: number;
      }

      interface MapsEventListener {
        remove(): void;
      }

      interface MapMouseEvent {
        latLng: LatLng | null;
      }

      // Library interfaces returned by importLibrary()
      interface MapsLibrary {
        Map: typeof Map;
        InfoWindow: typeof InfoWindow;
        LatLng: typeof LatLng;
        LatLngBounds: typeof LatLngBounds;
        Size: typeof Size;
      }

      interface MarkerLibrary {
        AdvancedMarkerElement: typeof marker.AdvancedMarkerElement;
      }

      interface GeocodingLibrary {
        Geocoder: typeof Geocoder;
      }

      namespace marker {
        class AdvancedMarkerElement {
          constructor(opts?: AdvancedMarkerElementOptions);
          map: Map | null;
          position: LatLng | LatLngLiteral | null;
          content: HTMLElement | null;
          addListener(eventName: string, handler: (...args: any[]) => void): MapsEventListener;
        }

        interface AdvancedMarkerElementOptions {
          map?: Map;
          position?: LatLng | LatLngLiteral;
          content?: HTMLElement;
          title?: string;
          zIndex?: number;
        }
      }

      class Geocoder {
        geocode(
          request: GeocoderRequest,
          callback?: (results: GeocoderResult[] | null, status: GeocoderStatus) => void
        ): Promise<GeocoderResponse>;
      }

      interface GeocoderRequest {
        address?: string;
        location?: LatLng | LatLngLiteral;
        placeId?: string;
        region?: string;
        componentRestrictions?: GeocoderComponentRestrictions;
      }

      interface GeocoderComponentRestrictions {
        country?: string | string[];
      }

      interface GeocoderResponse {
        results: GeocoderResult[];
      }

      interface GeocoderResult {
        formatted_address: string;
        geometry: GeocoderGeometry;
        address_components: GeocoderAddressComponent[];
        types: string[];
      }

      interface GeocoderGeometry {
        location: LatLng;
        location_type: GeocoderLocationType;
        viewport: LatLngBounds;
      }

      interface GeocoderAddressComponent {
        long_name: string;
        short_name: string;
        types: string[];
      }

      enum GeocoderLocationType {
        APPROXIMATE = 'APPROXIMATE',
        GEOMETRIC_CENTER = 'GEOMETRIC_CENTER',
        RANGE_INTERPOLATED = 'RANGE_INTERPOLATED',
        ROOFTOP = 'ROOFTOP',
      }

      enum GeocoderStatus {
        ERROR = 'ERROR',
        INVALID_REQUEST = 'INVALID_REQUEST',
        OK = 'OK',
        OVER_DAILY_LIMIT = 'OVER_DAILY_LIMIT',
        OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
        REQUEST_DENIED = 'REQUEST_DENIED',
        UNKNOWN_ERROR = 'UNKNOWN_ERROR',
        ZERO_RESULTS = 'ZERO_RESULTS',
      }

      class Circle {
        constructor(opts?: CircleOptions);
        setMap(map: Map | null): void;
        setCenter(center: LatLng | LatLngLiteral): void;
        setRadius(radius: number): void;
      }

      interface CircleOptions {
        center?: LatLng | LatLngLiteral;
        fillColor?: string;
        fillOpacity?: number;
        map?: Map;
        radius?: number;
        strokeColor?: string;
        strokeOpacity?: number;
        strokeWeight?: number;
      }
    }
  }
}
