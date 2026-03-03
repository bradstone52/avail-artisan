// Buffer polyfill for @react-pdf/renderer compatibility
import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Reset service workers and caches in dev, when ?resetSW=1 is present,
// OR when running on a Lovable preview URL (*.lovable.app) to prevent stale
// cached versions from showing up in the preview iframe.
// Wrapped in an IIFE to avoid top-level await (unsupported in ES2020 target).
(async () => {
  const isLovablePreview = window.location.hostname.endsWith('.lovable.app');
  const shouldReset =
    import.meta.env.DEV ||
    isLovablePreview ||
    new URLSearchParams(window.location.search).get('resetSW') === '1';

  if (!shouldReset) return;

  try {
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(n => caches.delete(n)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      const hadActive = regs.some(r => !!r.active);
      await Promise.all(regs.map(r => r.unregister()));
      if (hadActive) {
        // Reload once; resetSW param won't be present after reload so no loop.
        window.location.reload();
        return;
      }
    }
  } catch {
    // Silently ignore cache/SW errors
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
