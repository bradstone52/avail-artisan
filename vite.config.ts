import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      selfDestroying: true,
      includeAssets: ["favicon.png", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        name: "Snapshot Builder",
        short_name: "Snapshot",
        description: "Distribution intelligence and property tracking for logistics real estate",
        theme_color: "#2563eb",
        background_color: "#f5f3ef",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/dashboard",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Only pre-cache truly static assets (fonts, icons) — never JS/CSS/HTML
        globPatterns: ["**/*.{ico,png,svg,woff,woff2}"],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // NEVER use navigateFallback — it causes the SW to serve a stale
        // cached index.html after every new deployment until the SW self-destructs.
        navigateFallback: null,
        runtimeCaching: [
          {
            // JS/CSS already have content-hash filenames; use NetworkOnly so the
            // browser's own HTTP cache handles them. The SW must never intercept
            // these or users will see old bundles after a deploy.
            urlPattern: /\.(?:js|css|html)$/i,
            handler: "NetworkOnly",
          },
          {
            // Never cache Supabase API calls
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkOnly",
          },
          {
            // Never cache Google Maps API calls
            urlPattern: /^https:\/\/maps\.googleapis\.com\/.*/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Ensure all assets have content-based hashes for cache busting
    rollupOptions: {
      output: {
        // Use content hash in all filenames for aggressive cache busting
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
    // Generate a manifest for cache invalidation tracking
    manifest: true,
  },
  // Define build timestamp for debugging cache issues — force rebuild 2026-03-10T01
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    // Buffer polyfill for react-pdf compatibility
    "global.Buffer": "globalThis.Buffer",
  },
  optimizeDeps: {
    include: ["buffer"],
  },
}));
