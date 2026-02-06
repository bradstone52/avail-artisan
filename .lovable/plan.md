
# Phase 3: Inquiry & Lead Tracking ✅ COMPLETED (Includes Tours)

## Overview
Implemented inquiry and lead tracking for internal listings, allowing users to track prospects, manage pipeline stages, and log activity touchpoints. Also includes property tour logging functionality.

---

## Implementation Steps

### Step 1: Database Schema ✅
Created two tables for inquiry tracking:

**`internal_listing_inquiries`:**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| listing_id | UUID | FK to internal_listings |
| org_id | UUID | For RLS |
| contact_name | TEXT | Required |
| contact_email | TEXT | Optional |
| contact_phone | TEXT | Optional |
| contact_company | TEXT | Optional |
| source | TEXT | Lead source (Direct, Website, Signage, etc.) |
| stage | TEXT | Pipeline stage |
| assigned_broker_id | UUID | FK to agents |
| notes | TEXT | General notes |
| next_follow_up | DATE | Follow-up reminder |
| created_at/updated_at | TIMESTAMPTZ | Auto-managed |

**`internal_listing_inquiry_timeline`:**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| inquiry_id | UUID | FK to inquiries |
| org_id | UUID | For RLS |
| event_type | TEXT | Call, Email, Tour, etc. |
| notes | TEXT | Event notes |
| event_date | TIMESTAMPTZ | When event occurred |

### Step 2: RLS Policies ✅
Organization-based access control through internal_listings relationship.

### Step 3: Data Hook ✅
Created `useInternalListingInquiries.ts` with:
- `useInternalListingInquiries(listingId)` - CRUD for inquiries
- `useInquiryTimeline(inquiryId)` - CRUD for timeline events
- Constants: INQUIRY_SOURCES, INQUIRY_STAGES, TIMELINE_EVENT_TYPES

### Step 4: UI Components ✅
- `InquiriesSection.tsx` - Main tab component with pipeline filter
- `InquiryCard.tsx` - Individual inquiry display with expandable timeline
- `InquiryTimeline.tsx` - Activity log with add/delete
- `InquiryFormDialog.tsx` - Create/edit inquiry form

### Step 5: Integration ✅
Replaced placeholder in Inquiries tab of InternalListingDetail.tsx

---

## Features

### Pipeline Stages
New → Contacted → Tour Booked → Tour Completed → Offer Sent → LOI Pending → Completed/Lost

### Lead Sources
Direct, Website, Signage, Email Blast, LoopNet, CoStar, Referral, Cold Call, Trade Show, Other

### Timeline Event Types
Call, Email, Tour, Meeting, Offer, LOI, Note, Other

---

## Files Created/Modified

| Action | File |
|--------|------|
| ✅ Created | `src/hooks/useInternalListingInquiries.ts` |
| ✅ Created | `src/hooks/useInternalListingTours.ts` |
| ✅ Created | `src/components/internal-listings/InquiryCard.tsx` |
| ✅ Created | `src/components/internal-listings/InquiryTimeline.tsx` |
| ✅ Created | `src/components/internal-listings/InquiryFormDialog.tsx` |
| ✅ Created | `src/components/internal-listings/InquiriesSection.tsx` |
| ✅ Created | `src/components/internal-listings/TourFormDialog.tsx` |
| ✅ Created | `src/components/internal-listings/ToursSection.tsx` |
| ✅ Modified | `src/pages/InternalListingDetail.tsx` |
| ✅ Created | Database migrations for inquiry + tour tables + RLS |

---

# Phase 2: Document Management for Internal Listings ✅ COMPLETED

## Overview
Implement full document management capabilities for internal listings, allowing users to upload, view, download, and delete documents associated with each listing.

---

## Files Created/Modified

| Action | File |
|--------|------|
| ✅ Created | `src/hooks/useInternalListingDocuments.ts` |
| ✅ Created | `src/components/internal-listings/InternalListingDocumentsSection.tsx` |
| ✅ Modified | `src/pages/InternalListingDetail.tsx` |
| ✅ Created | Database migration for table + RLS |
| ✅ Created | Storage policy migration |

---

# Phase 4: AI Marketing & IDML Brochure Generation ✅ COMPLETED

## Overview
Implemented AI-powered marketing content generation and brochure creation for internal listings.

## Features
- **AI Marketing Copy**: Generates headline, tagline, description, highlights, and confidential broker pitch using Lovable AI (Gemini)
- **PDF Brochure**: Professional two-column layout with property specs, pricing, and marketing content
- **InDesign Export**: JSON data export compatible with Adobe InDesign Data Merge
- **Content Editing**: Full inline editing of AI-generated content before export
- **Confidential Toggle**: Option to include/exclude broker notes from exports

## Files Created/Modified

| Action | File |
|--------|------|
| ✅ Created | `supabase/functions/generate-listing-marketing/index.ts` |
| ✅ Created | `src/components/internal-listings/ListingBrochurePDF.tsx` |
| ✅ Created | `src/components/internal-listings/MarketingSection.tsx` |
| ✅ Modified | `src/pages/InternalListingDetail.tsx` |
| ✅ Modified | `supabase/config.toml` |

---

# Phase 6: Market Intelligence ✅ COMPLETED

## Overview
Implemented market intelligence features for internal listings, providing comparable listing tracking and pricing indicators to help brokers benchmark their listings against the market.

## Features

### Pricing Indicators
- **Rent Position**: Shows if your asking rent is below/at/above market average with percentage difference
- **Sale Position**: Shows if your asking sale price (per SF) is below/at/above market average
- Visual color-coded indicators (green = below, blue = at, amber = above)

### Market Summary
- Total active comparable listings count
- Average size in submarket
- Rent range (min-max) for comparable listings
- Average sale price per SF

### Comparable Listings
- Fetches active market listings in same submarket within ±30% size range (min 20,000 SF variance)
- Displays address, size, asking rate, clear height, and loading info
- Shows broker source for competitive intelligence

### Recent Transactions
- Shows deals closed in the last 24 months in the same submarket
- Links to transaction detail pages for full history
- Displays transaction type, price, and buyer/tenant info

## Files Created/Modified

| Action | File |
|--------|------|
| ✅ Created | `src/hooks/useMarketIntelligence.ts` |
| ✅ Created | `src/components/internal-listings/MarketIntelligenceSection.tsx` |
| ✅ Modified | `src/pages/InternalListingDetail.tsx` |

---

# Future Phases

## Phase 5: Smart Validation
- Data integrity checks for listings

## Phase 7: Analytics & Audit Trail
- View tracking and performance metrics

## Phase 8: Owner Portal
- Secure, read-only access for landlords
