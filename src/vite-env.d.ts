/// <reference types="vite/client" />

// Build-time constants for cache busting verification
declare const __BUILD_TIME__: string;

// Extend Window to include google (loaded at runtime via @googlemaps/js-api-loader)
interface Window {
  google: typeof google;
}
