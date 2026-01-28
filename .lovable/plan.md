
# Deal Detail Page Redesign Plan

## Overview
Redesign the Deal Detail page to show a clean, read-only summary view by default (matching your reference image), with action buttons in the header for generating deal sheets, editing, and deleting.

## Current State
- Deal Detail uses a tabbed interface with 6 tabs (Details, Agents, Parties, Conditions, Financial, Documents)
- Deal Sheet Generator is embedded inside the Documents tab
- Edit functionality is inline within each tab section

## Proposed Layout

```text
+------------------------------------------------------------------+
| <- Back    Deal #1234                [GENERATE DEAL SHEET] [DEAL |
|            123 Main Street            SUMMARY] [EDIT] [DELETE]   |
+------------------------------------------------------------------+
|                                                                  |
| +-----------------------------+  +-----------------------------+ |
| | Deal Details                |  | Documents        [+ UPLOAD] | |
| | Type: [Lease]   Address     |  | - Deal Sheet (Generated PDF)| |
| | Source: [---]   Size (SF)   |  | - Contract.pdf              | |
| |              Close Date     |  +-----------------------------+ |
| +-----------------------------+  | Financial Summary           | |
| | Important Dates             |  | Deal Value         $X,XXX   | |
| | - Condition 1: Jan 15, 2026 |  | Commission Rate       X%    | |
| | - Deposit Due: Jan 20, 2026 |  | Est. Commission    $X,XXX   | |
| +-----------------------------+  +-----------------------------+ |
+------------------------------------------------------------------+
```

## Implementation Steps

### 1. Refactor `src/pages/DealDetail.tsx`
- Remove the `Tabs` component and tabbed layout
- Create a header section with title and action buttons:
  - **Generate Deal Sheet** button (outlined, with FileText icon)
  - **Deal Summary** button (outlined, with FileText icon)
  - **Edit** button (outlined, with Edit icon)
  - **Delete** button (destructive variant, with Trash icon)
- Create a two-column responsive grid layout:
  - **Left column**: Deal Details card, Important Dates card
  - **Right column**: Documents card, Financial Summary card

### 2. Create `src/components/deals/detail/DealViewCard.tsx`
A new read-only card displaying:
- Deal Type (as a badge, like in the image)
- Address
- Size (SF) - formatted with commas
- Source (can be "Past Client" or other - may need to add field)
- Close Date

### 3. Create `src/components/deals/detail/DealFinancialSummaryCard.tsx`
A simplified read-only financial summary showing:
- Deal Value (formatted currency)
- Commission Rate (percentage)
- Est. Commission (calculated value)

### 4. Simplify `src/components/deals/detail/DealDocumentsSection.tsx`
- Move the upload form into a compact header button
- Show uploaded documents list with download icons
- Show "Deal Sheet" as a generated document entry when PDF has been created

### 5. Update `DealImportantDatesSection.tsx`
- Show a friendly empty state message: "No important dates. Generate a Deal Summary to add dates."
- Keep the existing logic for displaying condition and deposit due dates

### 6. Create Edit Dialog `src/components/deals/detail/DealEditDialog.tsx`
A full-featured dialog that opens when clicking "Edit" and contains:
- Tabs or sections for: Basic Info, Agents, Parties, Conditions, Deposits, Financial
- Uses existing section components (DealBasicSection, DealAgentsSection, etc.)
- Save/Cancel buttons

### 7. Add Delete Confirmation
- Wire up the Delete button to show a confirmation dialog
- On confirm, delete the deal and navigate back to `/deals`

### 8. Extract Deal Sheet Generation to Header
- Move the PDF generation logic from `DealSheetGenerator` into the header button click handler
- Keep the loading state during generation

---

## Technical Details

### Files to Create:
1. `src/components/deals/detail/DealViewCard.tsx` - Read-only deal summary
2. `src/components/deals/detail/DealFinancialSummaryCard.tsx` - Compact financial view
3. `src/components/deals/detail/DealEditDialog.tsx` - Full edit dialog with all sections
4. `src/components/deals/detail/DealDocumentsCard.tsx` - Compact documents card with upload

### Files to Modify:
1. `src/pages/DealDetail.tsx` - Complete refactor to new layout
2. `src/components/deals/detail/DealImportantDatesSection.tsx` - Add empty state message
3. `src/components/deals/detail/DealDocumentsSection.tsx` - Simplify to compact card

### Layout Structure:
```tsx
<div className="p-6 lg:p-8">
  {/* Header with back button, title, and action buttons */}
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-4">
      <Button variant="outline" onClick={() => navigate('/deals')}>
        <ArrowLeft /> Back
      </Button>
      <div>
        <h1>Deal #{deal.deal_number}</h1>
        <p className="text-muted-foreground">{deal.address}</p>
      </div>
    </div>
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleGenerateDealSheet}>
        <FileText /> GENERATE DEAL SHEET
      </Button>
      <Button variant="outline" onClick={handleDealSummary}>
        <FileText /> DEAL SUMMARY
      </Button>
      <Button variant="outline" onClick={() => setEditOpen(true)}>
        <Edit /> EDIT
      </Button>
      <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
        <Trash2 /> DELETE
      </Button>
    </div>
  </div>

  {/* Two-column content grid */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div className="space-y-6">
      <DealViewCard deal={deal} />
      <DealImportantDatesSection deal={deal} conditions={conditions} deposits={deposits} />
    </div>
    <div className="space-y-6">
      <DealDocumentsCard documents={documents} onUpload={uploadDocument} onDelete={deleteDocument} />
      <DealFinancialSummaryCard deal={deal} />
    </div>
  </div>
</div>

{/* Dialogs */}
<DealEditDialog open={editOpen} onOpenChange={setEditOpen} deal={deal} />
<ConfirmDialog ... delete confirmation ... />
```

### Styling Notes:
- Deal Type badge: Yellow/gold background matching the image (`bg-yellow-100 text-yellow-800`)
- Cards have rounded corners and subtle borders
- "Generated PDF" label for deal sheet in documents list
- Download icon buttons for document actions
- Destructive red for delete button
