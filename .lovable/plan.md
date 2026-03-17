
## What we're building

A polished, public-facing real estate website bolted on to the existing app at routes like `/market` and `/market/:id`. It will be connected to the custom domain `industrialmarket.ca` once set up in project settings. The site pulls only the listings you've manually flagged as "Published to Website" and requires zero login from visitors.

---

## Architecture overview

```text
avail-artisan.lovable.app (existing app)
    ├── /auth, /dashboard, /internal-listings …  (authenticated, unchanged)
    └── /market                 ← NEW public listing portal
    └── /market/:id             ← NEW public listing detail page

industrialmarket.ca → same Lovable app, same /market routes
```

Both the internal app and the public website live in the same Lovable project. The custom domain `industrialmarket.ca` is configured in Project Settings → Domains and simply points to the same deployment — visitors who go there will land on `/market` directly.

---

## Database changes

**1. Add `website_published` column to `internal_listings`**
A single boolean column (default `false`) controls whether a listing appears on the public site. This avoids touching the existing `status` field.

**2. Public RLS policy on `internal_listings`**
Add a permissive SELECT policy that allows anonymous (unauthenticated) reads of rows where `website_published = true` and `status = 'Active'`. All other columns are already safe to expose; `confidential_summary`, `broker_remarks`, and `owner_contact`/`owner_phone` will be intentionally excluded in the query.

**3. Public RLS policy on `internal_listing_photos`**
Add a permissive SELECT policy for photos whose listing is published, so the photo gallery works without auth.

**4. Public RLS policy on `agents` (read-only, name/phone/email only)**
A narrow public SELECT policy on the `agents` table for assigned agents linked to published listings.

**5. New `public_listing_inquiries` table**
A simple table to capture public inquiry form submissions (name, email, phone, company, message, listing_id). No auth required to insert; org members can read/manage them. This keeps public inquiries separate from the internal `internal_listing_inquiries` pipeline.

---

## New files

```text
src/pages/PublicMarket.tsx          — Listings portal (grid/list toggle, filters)
src/pages/PublicMarketDetail.tsx    — Individual listing detail page
src/components/public-market/
  PublicMarketLayout.tsx            — Header with ClearView logo + nav, footer
  PublicListingCard.tsx             — Card view for grid layout
  PublicListingRow.tsx              — Row view for list layout
  PublicMarketFilters.tsx           — Filter bar (type, deal type, city, size range)
  PublicListingInquiryForm.tsx      — Contact/inquiry form on detail page
  PublicListingSpecs.tsx            — Specs grid (SF, clear height, doors, etc.)
  PublicListingPhotos.tsx           — Photo gallery/carousel
src/hooks/usePublicListings.ts      — Fetches published listings (no auth)
```

---

## App.tsx changes

Add two new public routes:
```tsx
<Route path="/market" element={<PublicMarket />} />
<Route path="/market/:id" element={<PublicMarketDetail />} />
```

---

## Internal app changes

**`InternalListingEditDialog`** — Add a "Publish to Website" toggle switch.
**`InternalListingsTable`** — Add a small globe icon badge on published rows.
**`InternalListingDetail`** — Add a "Published / Unpublished" status indicator + toggle in the header actions.

---

## Public portal design

**Brand:** ClearView gold (#F5A623) + charcoal (#3D3D3D), white card surfaces, clean sans-serif.

**`/market` — Listings Portal**
- Header: ClearView logo left, "Available Properties" heading, grid/list toggle button top-right
- Filter bar: Property type, Deal type (Lease/Sale/Both), City, Min/Max SF
- Grid view: Photo-first cards showing address, size, deal type badge, asking rate, status chip
- List view: Compact rows with same info as a data table
- Empty state with ClearView branding

**`/market/:id` — Listing Detail**
- Full-bleed hero photo (or placeholder if none)
- Address + listing number + status badge in header
- Left column: Photo gallery, description, full specs grid (size, clear height, dock doors, drive-in, power, yard, sprinklers, LED, AC, rail)
- Right column: Pricing card (asking rate PSF, op costs, taxes, gross rate or sale price), Agent card (name, phone, email from agents table), Inquiry form (name, email, phone, company, message → saves to `public_listing_inquiries`)
- Breadcrumb back to `/market`

**Footer:** ClearView Commercial Realty Inc. copyright, simple links

---

## Custom domain

After implementing, the user connects `industrialmarket.ca` in Project Settings → Domains. Since both domains point to the same app, a simple redirect on the root `/` for that domain would send visitors to `/market`. We'll add a small route handler that detects the hostname and redirects accordingly.

---

## Summary of work

1. DB migration: add `website_published` column + public RLS policies + `public_listing_inquiries` table
2. New `usePublicListings` hook (unauthenticated query)
3. Public layout + all public market components
4. Two new public pages (`/market`, `/market/:id`)
5. Register routes in `App.tsx`
6. Add publish toggle to `InternalListingEditDialog` and status indicator to `InternalListingDetail`
