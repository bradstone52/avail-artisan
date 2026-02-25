// Buffer polyfill for @react-pdf/renderer compatibility
import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Aggressive cache busting: unregister all SWs, clear all caches, force reload if needed
async function clearStaleCaches() {
  try {
    // Delete all Cache Storage caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      let unregistered = false;
      for (const registration of registrations) {
        // Unregister stale SWs so the new bundle is served fresh
        const wasActive = !!registration.active;
        await registration.unregister();
        if (wasActive) unregistered = true;
      }

      // If we killed an active SW, reload immediately to pick up fresh assets
      if (unregistered) {
        window.location.reload();
        return;
      }

      // Re-register & reload when a new SW takes control
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  } catch (e) {
    // Silently ignore cache clearing errors
  }
}

clearStaleCaches();

createRoot(document.getElementById("root")!).render(<App />);
