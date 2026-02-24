// Buffer polyfill for @react-pdf/renderer compatibility
import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force service worker update check on every page load
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    registration.update();
  });

  // Listen for new service worker and reload immediately
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

createRoot(document.getElementById("root")!).render(<App />);
