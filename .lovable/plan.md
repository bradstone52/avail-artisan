

# Internal Listings Management System - Complete Implementation Plan

## Overview

This plan adds a comprehensive **Internal Listings Management** module to the CRE Tracker, transforming it into a full brokerage operations platform. The system is listing-centric, meaning each listing becomes the hub for marketing, inquiries, analytics, and reporting.

---

## Architecture Decision

**Create a new `internal_listings` table** separate from the existing `market_listings` table.

Rationale:
- `market_listings` tracks external/competitor listings for market research
- `internal_listings` tracks your own brokerage listings with different requirements: assigned agents, commission splits, marketing outputs, inquiry tracking, owner relationships, and audit trails

---

## Phase 1: Core Data Model & Dashboard

### Database Tables

**internal_listings**
- Core fields: id, listing_number, org_id, created_by, created_at, updated_at
- Property: address, display_address, city, submarket, zoning, size_sf, warehouse_sf, office_sf, clear_height_ft, power, yard, loading_type
- Financials: asking_rent_psf, asking_sale_price, op_costs, taxes, cam
- Status: status (Active, Pending, Leased, Sold, Expired, Archived), property_type, deal_type
- Assignment: assigned_agent_id, secondary_agent_id, owner_id
- Marketing: description, broker_remarks, confidential_summary
- Tracking: published_at, archived_at, archived_reason, latitude, longitude

**internal_listing_status_history**
- listing_id, previous_status, new_status, changed_by, changed_at, notes

### Extended Roles

Expand app_role enum to include: admin, broker, assistant, marketing

### UI Components

1. Internal Listings Dashboard at /cre-tracker/internal-listings
   - Card-based summary by status and agent
   - Quick filters: Status, Property Type, Deal Type, Agent, Size Range, Zoning, Price/Rent Band
   - Table with inline editing for Status and Asking Rate
   - Bulk actions bar for Admin/Assistant roles

2. Internal Listing Profile Page at /cre-tracker/internal-listings/:id
   - Tabbed interface: Overview, Documents, Inquiries, Marketing, Comparables, Activity

### Files to Create

- src/pages/InternalListings.tsx
- src/pages/InternalListingDetail.tsx
- src/hooks/useInternalListings.ts
- src/components/internal-listings/InternalListingsTable.tsx
- src/components/internal-listings/InternalListingEditDialog.tsx
- src/components/internal-listings/InternalListingProfileCard.tsx
- src/components/internal-listings/StatusHistoryTimeline.tsx
- src/components/internal-listings/InternalListingFilters.tsx

---

## Phase 2: Document Management & Uploads

### Database Table

**internal_listing_documents**
- listing_id, document_type (photo, brochure, floor_plan, title, environmental, rpr, other)
- file_path, file_name, file_size, uploaded_by, uploaded_at, sort_order, is_primary

### Features

- Multi-file upload with drag-and-drop using existing FileUpload pattern
- Document categorization
- Photo gallery with reordering and primary image selection
- Thumbnail previews

### Storage

- New bucket: internal-listing-assets
- Path pattern: {org_id}/{listing_id}/{document_type}/{filename}

### Files to Create

- src/components/internal-listings/DocumentsSection.tsx
- src/components/internal-listings/PhotoGallery.tsx
- src/hooks/useInternalListingDocuments.ts

---

## Phase 3: Inquiry & Lead Tracking

### Database Tables

**internal_listing_inquiries**
- listing_id, contact_name, contact_email, contact_phone, company
- source (website, qr_signage, email_blast, loopnet, manual)
- stage (new, contacted, tour_booked, offer_sent, loi_pending, completed, lost)
- assigned_broker_id, notes, created_at, updated_at

**internal_listing_inquiry_timeline**
- inquiry_id, event_type, notes, created_by, created_at

### Features

- Listing-centric inquiry list with source tracking
- Stage pipeline with one-click stage changes
- Timeline view of all inquiry activity
- Convert inquiry to Deal linking to existing Deals module

### Files to Create

- src/hooks/useInternalListingInquiries.ts
- src/components/internal-listings/InquiriesSection.tsx
- src/components/internal-listings/InquiryCard.tsx
- src/components/internal-listings/InquiryTimeline.tsx
- src/components/internal-listings/ConvertToDealDialog.tsx

---

## Phase 4: Marketing Output Generation with IDML Support

### Brochure Generation Strategy

Dual-output system for maximum flexibility:
1. PDF Preview - For quick sharing, email attachments, immediate use
2. IDML Package - InDesign's native interchange format for full editing

IDML was chosen because:
- Native InDesign format preserves layout, styles, and structure perfectly
- InDesign opens it as a native document
- All text, images, styles preserved for any edit

### Database Tables

**internal_listing_marketing_outputs**
- listing_id, output_type (pdf_brochure, idml_brochure, web_page, email_flyer, loopnet_copy, mls_copy)
- content, tone (industrial_investor, owner_user, leasing_focused)
- generated_at, last_edited_at, storage_path

**internal_listing_brochures**
- id, listing_id, created_at, created_by
- idml_storage_path, pdf_storage_path
- template_used (industrial_standard, retail_premium, quick_flyer)
- ai_copy_version, status (draft, published)

### Edge Function: generate-listing-brochure

1. Fetch listing data (property details, photos, financials)
2. Generate AI marketing copy via Lovable AI (gemini-3-flash-preview)
3. Build IDML XML structure with predefined styles
4. Package into ZIP and upload to storage
5. Generate PDF preview using existing react-pdf/renderer pattern

### IDML Structure

```text
brochure.idml (ZIP archive)
├── designmap.xml
├── Resources/
│   ├── Fonts.xml
│   ├── Styles.xml
│   └── Graphic.xml
├── Spreads/
│   └── Spread_u123.xml
├── Stories/
│   └── Story_u456.xml
└── META-INF/
    └── container.xml
```

### Brochure Templates

1. Industrial Standard - 2-page, photo-heavy, spec-focused
2. Retail/Office Premium - 4-page, lifestyle imagery, detailed amenities
3. Quick Flyer - 1-page, single property highlight

### AI-Powered Copy Generation

Uses Lovable AI (gemini-3-flash-preview) for:
- Property descriptions
- Broker remarks
- Confidential summaries
- Buyer/tenant-specific pitches
- Simple explanations for junior staff

### Storage

- New bucket: listing-brochures
- Path pattern: {org_id}/{listing_id}/{date}-{template}.idml

### Files to Create

- supabase/functions/generate-listing-brochure/index.ts
- src/components/internal-listings/MarketingSection.tsx
- src/components/internal-listings/BrochureGenerator.tsx
- src/components/internal-listings/BrochurePreviewDialog.tsx
- src/components/internal-listings/AIDescriptionGenerator.tsx
- src/components/internal-listings/MarketingOutputCard.tsx
- src/hooks/useListingMarketing.ts
- src/hooks/useListingBrochures.ts

---

## Phase 5: Smart Validation & Auto-Sync

### Validation Rules (Warnings)

- Clear height mismatch (e.g., >40' unusual for office)
- Operating costs outside market range
- Missing critical fields (yard, power, zoning)
- Incomplete photos/brochure before publishing

### Auto-Sync Actions

- Status to Leased/Sold: Auto-archive, remove from public, create transaction
- Price/rent change: Log to history
- Publish action: Validate required fields first

### Files to Create

- src/lib/listingValidation.ts
- src/components/internal-listings/ValidationWarnings.tsx

---

## Phase 6: Market Intelligence Panel

### Database Table

**internal_listing_comparables**
- listing_id, comparable_address, rent_psf, sale_price_psf, vacancy_rate, notes, added_at

### Features

- Add comparable listings manually
- Market rent/sale ranges by submarket
- Vacancy snapshot
- Pricing comparison indicator
- Future: Auto-suggest comps, flag pricing above/below market

### Files to Create

- src/components/internal-listings/ComparablesSection.tsx
- src/components/internal-listings/MarketIntelligenceCard.tsx
- src/hooks/useListingComparables.ts

---

## Phase 7: Analytics & Audit Trail

### Database Table

**internal_listing_views**
- listing_id, view_type (web, pdf, email), source, viewer_info, viewed_at

### Listing Performance Metrics

- Views (web, PDF, email)
- Inquiries count
- Tours completed
- Time on market
- Price/rent adjustment history

### Audit Trail

- All status changes with user and timestamp
- Marketing output generation events
- Document uploads/deletions
- Inquiry stage changes

### Agent Performance (Admin Only)

- Listings by agent
- Average time to lease/sale
- Inquiry conversion rates

### Files to Create

- src/components/internal-listings/AnalyticsSection.tsx
- src/components/internal-listings/AuditTrailTimeline.tsx
- src/hooks/useListingAnalytics.ts

---

## Phase 8: Owner Portal (Optional)

### Features

- Read-only access per listing for owners/landlords
- Marketing activity summary
- Inquiry volume and tours completed
- Status updates
- Monthly auto-generated listing performance PDF

### Implementation

- Extend existing landlords table with portal_access flag
- Magic link authentication for owners
- Restricted views based on listing assignment

---

## Navigation Integration

Add to CRE Tracker sidebar:

```text
CRE Tracker
├── Dashboard (existing)
├── Deals (existing)
├── Prospects (existing)
├── Internal Listings (NEW)
│   └── All Listings, My Listings, Inquiries
├── BrokerageDB (existing)
```

---

## Security & RLS Policies

All new tables will have org-based RLS:
- Users can only access listings within their org
- Role-based permissions at both UI and API level
- Marketing role cannot see financial fields
- Audit trail is append-only (no delete for non-admins)

---

## Technical Summary

| Component | Count |
|-----------|-------|
| New Database Tables | 9 |
| New Pages | 2 |
| New Components | ~25 |
| New Hooks | ~10 |
| New Edge Functions | 1 |
| New Storage Buckets | 2 |

---

## Implementation Order

1. Phase 1: Core schema + Dashboard
2. Phase 2: Document uploads
3. Phase 3: Inquiry tracking
4. Phase 4: AI marketing copy + IDML brochure generation
5. Phase 5: Validation
6. Phase 6: Comparables
7. Phase 7: Analytics
8. Phase 8: Owner portal (optional)

