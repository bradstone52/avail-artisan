
# Pre-flight: Fix 4 TypeScript Build Errors (Type Casts Only)

## Changes — 3 files, 4 lines

### 1. `supabase/functions/geocode-market-listing/index.ts`

**Line 498** — cast `listing.address` and `listing.city` to `string`:
```typescript
// Before
const geocodeResult = await geocodeWithGoogle(listing.address, listing.city, googleApiKey);

// After
const geocodeResult = await geocodeWithGoogle(listing.address as string, listing.city as string, googleApiKey);
```

**Line 514** — cast `listing.address` to `string`:
```typescript
// Before
? await determineSubmarket(geocodeResult.lat, geocodeResult.lng, listing.address)

// After
? await determineSubmarket(geocodeResult.lat, geocodeResult.lng, listing.address as string)
```

---

### 2. `supabase/functions/refresh-statutory-holidays/index.ts`

**Line 97** — cast `err` as `Error`:
```typescript
// Before
JSON.stringify({ error: err.message }),

// After
JSON.stringify({ error: (err as Error).message }),
```

---

### 3. `supabase/functions/rocketreach-lookup/index.ts`

**Line 159** — cast `p.id` to `string`:
```typescript
// Before
const full = await lookupById(p.id);

// After
const full = await lookupById(p.id as string);
```

---

## Scope

- No logic changes anywhere
- No other files touched
- Build errors resolved; green build before the main feature slices begin
