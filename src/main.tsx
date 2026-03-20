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

  // 3. If this is a new build, hard-reload once to flush any HTTP-cached chunks
  try {
    const stored = sessionStorage.getItem(BUILD_KEY);
    if (stored && stored !== BUILD_TIME) {
      // New build detected — clear storage flag then reload from network
      sessionStorage.setItem(BUILD_KEY, BUILD_TIME);
      window.location.reload();
      return; // stop here; the reload will remount the app fresh
    }
    sessionStorage.setItem(BUILD_KEY, BUILD_TIME);
  } catch { /* ignore */ }

  // 4. Mount the app
  createRoot(document.getElementById("root")!).render(<App />);
}

purgeAndMount();

