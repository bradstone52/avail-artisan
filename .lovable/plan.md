
## Tour Log PDF Export

### Overview
Add an "Export PDF" button to the Property Tours section in the Internal Listing detail page. Clicking it instantly generates and downloads a clean PDF report of all logged tours for that listing — no dialog needed, just a one-click download.

### What will be built

**1. New file: `src/components/internal-listings/TourLogPDF.tsx`**

A `@react-pdf/renderer` Document component styled to match the existing deal PDFs (Clearview logo, orange accent, same typography). The PDF will contain:

- **Header**: Clearview logo (top-left), generated date (top-right), orange bottom border
- **Property banner**: Property address and listing number in a shaded subtitle bar
- **Summary line**: "X tours logged between [earliest date] and [latest date]"
- **Tour rows table** with columns:
  - Date & Time
  - Touring Party (Name / Company)
  - Showed By (Agent / Brokerage)
  - Notes
- **Footer**: Page number

**2. Updated file: `src/components/internal-listings/ToursSection.tsx`**

- Import `pdf` from `@react-pdf/renderer` and the new `TourLogPDF`
- Add an "Export PDF" button in the card header (next to "Log Tour"), disabled when `tours.length === 0`
- The button calls an async handler that:
  1. Calls `pdf(<TourLogPDF ... />).toBlob()`
  2. Creates a temporary `<a>` element with the blob URL
  3. Triggers a download with filename `tour-log-[address]-[date].pdf`
  4. Shows a `toast.success` on completion

### Visual design (PDF)
Consistent with existing deal PDFs:
- Colors: `ORANGE = '#e8792b'`, `GRAY_BG = '#f7f7f7'`, `BORDER = '#e0e0e0'`
- Font: Helvetica, 8pt body
- Table with alternating row shading for readability
- "Not specified" italics for empty fields, matching the UI card

### Props passed from `ToursSection` to `TourLogPDF`
- `tours`: full array of `InternalListingTour`
- `listingAddress`: string (passed as a new prop to `ToursSection` from the detail page)
- `generatedAt`: current date

### Files changed
| File | Action |
|---|---|
| `src/components/internal-listings/TourLogPDF.tsx` | Create new |
| `src/components/internal-listings/ToursSection.tsx` | Add export button + handler, add `listingAddress` prop |
| `src/pages/InternalListingDetail.tsx` | Pass `listingAddress` to `ToursSection` |
