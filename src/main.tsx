// Buffer polyfill for @react-pdf/renderer compatibility
import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Nuke all service workers and caches on every load to prevent stale UI
(async () => {
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
        window.location.reload();
        // Stop rendering — the reload will pick up fresh assets
        throw new Error('SW_RELOAD');
      }
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'SW_RELOAD') throw e;
    // Silently ignore other cache clearing errors
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
