

# Deal Creation & Deal Sheet Generator Updates

## Overview
This plan addresses multiple improvements:
1. Rename "Size (SF)" to "Size" in the new deal form
2. Fix acres population and display with proper unit suffixes (SF or AC)
3. Create a comprehensive "Generate Deal Sheet" modal with all the required sections
4. Fix PDF styling to match the example (proper logo aspect ratio and colors)

---

## Part 1: New Deal Form Updates

### File: `src/components/deals/DealFormDialog.tsx`

**Changes:**
- Rename the "Size (SF)" label to just "Size"
- Track whether the size is in SF or AC with a new state variable `sizeUnit`
- Fix the acres conversion logic to properly handle string parsing
- Display the size with the appropriate unit suffix (e.g., "1,234 SF" or "12.5 AC")

**Logic for size population:**
```text
When a listing is selected:
1. If listing.size_sf > 0:
   - Use size_sf as the value
   - Set sizeUnit = 'SF'
2. Else if listing.land_acres is a valid number > 0:
   - Use the acres value directly (don't convert to SF)
   - Set sizeUnit = 'AC'
3. Display the size with the unit suffix in a read-only formatted input
```

---

## Part 2: Generate Deal Sheet Modal

### New File: `src/components/deals/GenerateDealSheetDialog.tsx`

A comprehensive multi-section dialog that opens when clicking "GENERATE DEAL SHEET":

**Sections:**

**A. Basic Information**
- Deal Number (auto-filled, disabled)
- Deal Type (auto-filled, disabled)
- Address (auto-filled, disabled)
- City (auto-filled, disabled)
- Size with unit suffix (auto-filled, disabled)
- Notes/Comments (editable text area)

**B. Agents - Listing Side**
- Listing Brokerage (dropdown with "Add New" option)
- Listing Agent 1 (dropdown filtered by selected brokerage)
- Listing Agent 2 (dropdown filtered by selected brokerage)
- "Add New" brokerage dialog with:
  - Brokerage Name
  - Address
  - Button to "Add Agent" (Name, Phone, Email)

**C. Agents - Selling Side**
- Selling Brokerage (dropdown with "Add New" option)
- Selling Agent 1 (dropdown filtered by selected brokerage)
- Selling Agent 2 (dropdown filtered by selected brokerage)

**D. CV Agent**
- Dropdown showing only agents where brokerage.name = 'Clearview Commercial Realty Inc.'

**E. Parties**
- Seller Name (text input)
- Seller Brokerage (dropdown with "Add New" option)
- Buyer Name (text input)
- Buyer Brokerage (dropdown with "Add New" option)

**F. Conditions**
- Add multiple conditions with:
  - Description (text input)
  - Date (date picker)

**G. Deposits**
- Amount (currency input)
- Held By (text input)

**H. Financial**
- Sale Price/Deal Value (currency input, pre-filled from deal)
- Total Commission % (default 3%)
- Other Brokerage % (default 1.5%)
- Clearview % (default 1.5%)
- GST Rate % (default 5%)

**I. Commission Preview**
- Real-time calculations showing:
  - Total Commission (excl. GST)
  - GST on Commission
  - Total Commission (incl. GST)
  - Other Brokerage portion
  - Clearview portion

**J. Actions**
- "Preview" button - Shows a summary of all entered data
- "Download PDF" button - Generates and downloads the deal sheet

### Helper Components to Create:

1. **`src/components/deals/detail/AddBrokerageWithAgentsDialog.tsx`**
   - Dialog for adding new brokerage with optional agents
   - Fields: Brokerage Name, Address
   - Expandable section to add agents (Name, Phone, Email)

2. **`src/components/deals/detail/AgentSelector.tsx`**
   - Reusable component for selecting agents filtered by brokerage

---

## Part 3: PDF Styling Fixes

### File: `src/components/documents/DealSheetPDF.tsx`

**Logo Fix:**
- Current: `width: 150, height: 40` - This squishes the logo
- The uploaded logo has an aspect ratio of approximately 6:1 (wide logo)
- Fix: Use `width: 200, height: 50` or use `objectFit: 'contain'`

**Color Matching:**
Based on the example PDF:
- Section headers have an orange/gold underline: `#E4A815` (matching the logo)
- Section background: White with subtle border
- Table headers: Gold/orange background: `#E4A815` or `#F7C948`
- Text colors: Dark gray `#333` for headings, `#666` for labels

**Updated styles:**
```javascript
// Header section underline
headerUnderline: {
  borderBottomWidth: 2,
  borderBottomColor: '#E4A815',
  marginBottom: 20,
}

// Section title styling
sectionTitle: {
  fontSize: 11,
  fontWeight: 'bold',
  marginBottom: 8,
  color: '#333',
  textDecoration: 'underline',
}

// Table header row (gold background)
tableHeader: {
  backgroundColor: '#E4A815',
  color: '#fff',
  padding: 8,
}
```

---

## Part 4: Update DealDetail.tsx

### File: `src/pages/DealDetail.tsx`

**Changes:**
- Replace direct `handleGenerateDealSheet` with opening the new `GenerateDealSheetDialog`
- Pass the deal data to the dialog
- The dialog will handle saving updates to the deal and generating the PDF

---

## Implementation Summary

### Files to Create:
1. `src/components/deals/GenerateDealSheetDialog.tsx` - Main dialog with all sections
2. `src/components/deals/detail/AddBrokerageWithAgentsDialog.tsx` - Add brokerage + agents
3. `src/components/deals/detail/AgentSelector.tsx` - Agent dropdown filtered by brokerage

### Files to Modify:
1. `src/components/deals/DealFormDialog.tsx` - Size field label and unit handling
2. `src/components/documents/DealSheetPDF.tsx` - Logo sizing and color matching
3. `src/pages/DealDetail.tsx` - Open dialog instead of direct PDF generation

### Database Updates Needed:
- Add `size_unit` field to deals table (optional - can be derived from listing)
- Alternatively, store a `size_display` string like "1,234 SF" or "12.5 AC"

---

## Technical Details

### Size Unit Logic (DealFormDialog.tsx):
```typescript
// State to track size and its unit
const [sizeValue, setSizeValue] = useState<number | undefined>();
const [sizeUnit, setSizeUnit] = useState<'SF' | 'AC'>('SF');

// When listing is selected
const handleListingChange = (listing: MarketListing | null) => {
  if (listing) {
    if (listing.size_sf && listing.size_sf > 0) {
      setSizeValue(listing.size_sf);
      setSizeUnit('SF');
    } else if (listing.land_acres) {
      const acres = parseFloat(listing.land_acres);
      if (!isNaN(acres) && acres > 0) {
        setSizeValue(acres);
        setSizeUnit('AC');
      }
    }
  }
};

// Display format
const sizeDisplay = sizeValue 
  ? `${sizeValue.toLocaleString()} ${sizeUnit}` 
  : '';
```

### CV Agent Filter (GenerateDealSheetDialog.tsx):
```typescript
const cvAgents = agents?.filter(agent => 
  agent.brokerage?.name === 'Clearview Commercial Realty Inc.'
) || [];
```

### Commission Calculations:
```typescript
const dealValue = formData.deal_value || 0;
const commissionRate = formData.commission_percent || 3;
const otherRate = formData.other_brokerage_percent || 1.5;
const cvRate = formData.clearview_percent || 1.5;
const gstRate = formData.gst_rate || 5;

const totalCommission = dealValue * commissionRate / 100;
const totalGST = totalCommission * gstRate / 100;
const totalWithGST = totalCommission + totalGST;

const otherCommission = dealValue * otherRate / 100;
const cvCommission = dealValue * cvRate / 100;
```

