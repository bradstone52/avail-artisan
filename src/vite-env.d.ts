/// <reference types="vite/client" />

// Build-time constants for cache busting verification
declare const __BUILD_TIME__: string;

// Google Maps global namespace - loaded via @googlemaps/js-api-loader at runtime
declare namespace google {
  namespace maps {
    // Re-export from @types/google.maps via triple-slash
  }
}
