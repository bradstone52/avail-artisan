// Buffer polyfill for @react-pdf/renderer compatibility
import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Build timestamp injected by Vite — changes on every deploy
const BUILD_TIME: string = __BUILD_TIME__;
const BUILD_KEY = 'app_build_time';

async function purgeAndMount() {
  // 1. Unregister service workers
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
  } catch { /* ignore */ }

  // 2. Clear all caches
  try {
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(n => caches.delete(n)));
    }
  } catch { /* ignore */ }

  // 3. Use localStorage (persists across sessions/tabs) to detect new builds
  //    and hard-reload once to flush any HTTP-cached JS chunks.
  try {
    const stored = localStorage.getItem(BUILD_KEY);
    if (stored !== BUILD_TIME) {
      // New build detected — store the new timestamp, then force a full network reload
      localStorage.setItem(BUILD_KEY, BUILD_TIME);
      // Use cache-busting query param to guarantee the server returns a fresh response
      const url = new URL(window.location.href);
      url.searchParams.set('_cb', BUILD_TIME);
      window.location.replace(url.toString());
      return; // stop here; the reload will remount the app fresh
    }
    // Clean up the cache-bust param from the URL after reload
    const url = new URL(window.location.href);
    if (url.searchParams.has('_cb')) {
      url.searchParams.delete('_cb');
      window.history.replaceState({}, '', url.toString());
    }
  } catch { /* ignore */ }

  // 4. Mount the app
  createRoot(document.getElementById("root")!).render(<App />);
}

purgeAndMount();

