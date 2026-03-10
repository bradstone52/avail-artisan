import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
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
