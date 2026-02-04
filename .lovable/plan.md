
# Phase 2: Document Management for Internal Listings

## Overview
Implement full document management capabilities for internal listings, allowing users to upload, view, download, and delete documents associated with each listing. This follows the established patterns from the Deals module.

---

## Implementation Steps

### Step 1: Database Schema
Create the `internal_listing_documents` table to store document metadata.

**Table Structure:**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key, auto-generated |
| listing_id | UUID | Foreign key to `internal_listings` |
| org_id | UUID | For RLS enforcement |
| name | TEXT | Display name (user-editable) |
| file_path | TEXT | Storage path in bucket |
| file_size | INTEGER | Size in bytes |
| file_type | TEXT | MIME type (optional) |
| uploaded_by | UUID | Reference to user |
| uploaded_at | TIMESTAMPTZ | Auto-set to now() |

**RLS Policies:**
- SELECT/INSERT/UPDATE/DELETE: Users can only access documents where listing belongs to their organization

### Step 2: Storage Bucket Policies
Configure RLS on the existing `internal-listing-assets` bucket to enforce organization-based access control for file operations.

### Step 3: Create Data Hook
Create `useInternalListingDocuments.ts` with:
- Query to fetch documents for a listing
- Upload function (file + metadata)
- Delete function (storage + database)
- Download URL generation via signed URLs

### Step 4: Build UI Component
Create `InternalListingDocumentsSection.tsx`:
- Upload form with drag-and-drop support
- Document list with name, size, date
- Download and delete actions per document
- Empty state messaging
- Loading and uploading states

### Step 5: Integrate into Detail Page
Replace the placeholder content in the Documents tab of `InternalListingDetail.tsx` with the new `InternalListingDocumentsSection` component.

---

## Technical Details

### File Path Convention
```text
{listing_id}/{timestamp}-{sanitized_name}.{extension}
```
Example: `cc88991f-53e4-4b96-928e-e295ed3c43c3/1707012345678-lease-agreement.pdf`

### Supported File Types
- PDFs (primary)
- Images (JPG, PNG)
- Office documents (DOCX, XLSX)
- Maximum size: 15MB per file

### Component Architecture
```text
InternalListingDetail.tsx
  └── Documents Tab
       └── InternalListingDocumentsSection.tsx
            ├── Upload Form (drag-drop + file input)
            ├── Document List
            │    └── Document Row (name, size, date, actions)
            └── Empty State
```

---

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | `src/hooks/useInternalListingDocuments.ts` |
| Create | `src/components/internal-listings/InternalListingDocumentsSection.tsx` |
| Modify | `src/pages/InternalListingDetail.tsx` |
| Create | Database migration for table + RLS |
| Create | Storage policy migration |
