// Buffer polyfill for @react-pdf/renderer compatibility
import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Aggressively reset service workers and caches on every load in dev/preview.
// Uses sessionStorage to prevent infinite reload loops.
(async () => {
  const isLovablePreview = window.location.hostname.endsWith('.lovable.app') || window.location.hostname.endsWith('.lovable.dev');
  const shouldReset =
    import.meta.env.DEV ||
    isLovablePreview ||
    new URLSearchParams(window.location.search).get('resetSW') === '1';

  if (!shouldReset) return;

  // Prevent reload loop: only reload once per session
  const alreadyReset = sessionStorage.getItem('sw_reset_done') === __BUILD_TIME__;

  try {
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(n => caches.delete(n)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      const hadActive = regs.some(r => !!r.active);
      await Promise.all(regs.map(r => r.unregister()));
      if (hadActive && !alreadyReset) {
        sessionStorage.setItem('sw_reset_done', __BUILD_TIME__);
        window.location.reload();
        return;
      }
    }
  } catch {
    // Silently ignore cache/SW errors
  }
  // Mark as reset even if no SW was active
  sessionStorage.setItem('sw_reset_done', __BUILD_TIME__);
})();

createRoot(document.getElementById("root")!).render(<App />);
