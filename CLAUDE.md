# avail-artisan — Claude Code Guide

## UI/UX Refactor In Progress
Active refactor work follows the plan in `CLAUDE_PLAN.md` — decisions, target state, and 8 sequenced sessions. Read that file before working on any UI/UX task.

## Business Context
ClearView Commercial Realty Inc. — Calgary-based industrial commercial real estate brokerage. Brokers: Brad Stone and Doug Johannson. This is an internal operations platform for tracking market listings, properties, transactions, deals, prospects, tenants, and distributing market intelligence to clients.

## Stack
- Frontend: React / TypeScript / Vite / Tailwind CSS / shadcn/ui
- Backend: Supabase (PostgreSQL, edge functions, auth, storage)
- Hosting: DigitalOcean App Platform (static site, auto-deploys on git push to main)
- Repo: github.com/bradstone52/avail-artisan (private)
- Package manager: npm

## Supabase Project
- Project ref: gdqvqnurpyxobjdbozlp
- URL: https://gdqvqnurpyxobjdbozlp.supabase.co
- Region: us-east-1 (Toronto)
- Primary user: brad@cvpartners.ca (admin)
- Org ID: 5953b607-b94f-40ee-b3ae-85e549e2ca31

## Deploy Workflow

### Frontend changes (src/ files)
git add .
git commit -m "description"
git push
# DigitalOcean auto-deploys on push to main

### Edge function changes (supabase/functions/)
supabase functions deploy function-name
git add .
git commit -m "description"
git push

### Database schema changes
supabase db push
git add .
git commit -m "description"
git push

## Architecture

### Key Pages
- Dashboard — overview of listings, issues, distribution
- Market Listings — 300+ competitor/market listings with audit tools
- Internal Listings — ClearView's own active listings
- CRE Tracker — core internal deal/market tracking tool
- Properties — 350+ property records with City of Calgary data integration
- Transactions — 110+ completed sales and lease transactions
- Deals — active deal pipeline with conditions, deposits, documents
- Prospects — prospect pipeline with tasks and follow-ups
- Tenants — tenant tracking
- Distribution — issue builder and recipient distribution system
- Issues — market snapshot reports distributed to clients

### Key Edge Functions
- generate-listing-marketing — AI marketing copy generation
- proxy-static-map — Google Maps Static API proxy
- get-mapbox-token — Mapbox token provider
- validate-brochure-links — Firecrawl-powered brochure link checker
- audit-brokerage-pdf / audit-landlord-website — market listing audit tools
- fetch-city-data — Calgary open data API integration (assessment, permits, parcels)
- search-calgary-parcels — Calgary parcel address search
- fetch-market-listings — market listing data fetching
- find-brochure / download-brochure — brokerage brochure finder
- parse-brokerage-pdf — PDF import and parsing
- send-prospect-email — prospect email sending via Resend
- geocode-property / geocode-market-listing / geocode-listings — geocoding
- dormant-prospects-digest — scheduled email for stale prospects
- stale-listings-report — scheduled daily stale listings email
- nightly-property-sync — scheduled property data sync
- send-prospect-task-reminders — scheduled task reminder emails
- export-backup — data backup function
- generate-pdf — DocRaptor PDF generation (used for distribution PDFs)

### Key External Services & Secrets
- GOOGLE_MAPS_API_KEY — Maps Static API, Geocoding API
- GOOGLE_GEOCODING_API_KEY — Geocoding
- GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET — OAuth
- MAPBOX_ACCESS_TOKEN — Mapbox maps
- RESEND_API_KEY — email sending
- FIRECRAWL_API_KEY — web scraping for brochure/listing audits
- DOCRAPTOR_API_KEY — PDF generation for distribution reports
- CALGARY_APP_TOKEN — Calgary open data API (add when obtained)
- BROWSERLESS_API_KEY — available but not currently used

## Important Technical Notes

### JWT Verification
JWT verification is DISABLED on all user-facing edge functions.
Reason: Supabase new publishable key format uses ES256 algorithm but edge function runtime expects HS256.
Scheduled functions keep their default JWT settings — do not change them:
- dormant-prospects-digest
- stale-listings-report  
- nightly-property-sync
- send-prospect-task-reminders

### Storage Migration (ACTION REQUIRED before May 7, 2026)
Storage files (photos, PDFs) still hosted on Lovable's servers.
Buckets to migrate:
- internal-listing-assets (public)
- internal-listing-photos (public)
- asset-photos (public)
- issue-pdfs (public)
- cover-images (public)
- deals (private)
- property-brochures (private)
- data-backups (private)
- underwriting-docs (private)

### Known Issues
- Calgary open data API (fetch-city-data, search-calgary-parcels) may need CALGARY_APP_TOKEN for rate limiting — register at data.calgary.ca
- Distribution PDF generation uses generate-pdf edge function with DocRaptor

### Removed Features (do not re-add)
- Underwriter / underwriting tools
- RocketReach contact lookup
- Brochure Builder (using InDesign templates instead)

## Domain & Hosting
- Custom domain: logistics-space.net
- DNS: GoDaddy (A records pointing to DigitalOcean)
- DigitalOcean app URL: avail-artisan-i9mgy.ondigitalocean.app
- Supabase auth redirect URLs include both domains

## Development Notes
- Always run npm run build locally to check for TypeScript errors before pushing
- The app uses react-resizable-panels, @react-pdf/renderer (for deal sheets only), pptxgenjs removed
- shadcn/ui components throughout — use existing patterns when adding UI
- All data is org-scoped via RLS policies using get_user_org_ids() function
