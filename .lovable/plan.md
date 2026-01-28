
# Fix Deal Summary PDF Generation - Buffer Polyfill Issue

## Problem Identified
The console shows **"Buffer is not defined"** errors when trying to generate the Deal Summary PDF. This is because `@react-pdf/renderer` requires the Node.js `Buffer` API, which isn't available in browsers by default.

## Root Cause
While `vite.config.ts` has the Buffer polyfill configured:
```typescript
define: {
  "global.Buffer": "globalThis.Buffer",
},
optimizeDeps: {
  include: ["buffer"],
},
```

The actual `buffer` package is never imported and assigned to `globalThis.Buffer` at runtime. The config tells Vite to replace references, but `globalThis.Buffer` is still `undefined`.

## Solution
Add the Buffer polyfill import at the top of `src/main.tsx` before the app renders:

```typescript
import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;
```

This ensures Buffer is available globally before any PDF rendering code executes.

## Technical Implementation

### File: `src/main.tsx`
Add at the very top (before any other imports):
```typescript
// Buffer polyfill for @react-pdf/renderer compatibility
import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
```

## Why This Works
- The `buffer` package is already a dependency (listed in package.json)
- By importing and assigning it to `globalThis.Buffer` at the app entry point, it becomes available to all downstream code
- `@react-pdf/renderer` will then be able to use Buffer for its internal PDF generation operations

## Expected Outcome
After this fix:
1. PDF generation will work without "Buffer is not defined" errors
2. The updated layout (centered title, centered table contents, hardcoded footer) will render correctly
3. Users can successfully download the Deal Summary PDF

