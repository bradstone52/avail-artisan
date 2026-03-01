// Buffer polyfill for @react-pdf/renderer compatibility
import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Reset service workers and caches only in dev or when ?resetSW=1 is present.
// Production loads do NOT wipe caches by default.
const shouldReset =
  import.meta.env.DEV ||
  new URLSearchParams(window.location.search).get('resetSW') === '1';

if (shouldReset) {
  await (async () => {
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
          // Reload once to pick up fresh assets; the param will be absent
          // on the reloaded page so we won't loop.
          window.location.reload();
          return;
        }
      }
    } catch {
      // Silently ignore cache/SW errors
    }
  })();
}

createRoot(document.getElementById("root")!).render(<App />);
