

# Deal Sheet PDF Redesign Plan

## Overview
Complete redesign of the Deal Sheet PDF (`DealSheetPDF.tsx`) to match the reference template, with the following changes:
1. New color scheme with blue headers, yellow party sections, green commission area, and pink comments
2. Static title "sale/lease dealsheet" instead of dynamic "CLEARVIEW [TYPE] DEALSHEET"
3. Date auto-populates with today's date (already working - no changes needed)
4. Keep Clearview logo in top left
5. Bordered table layout for Property/Deal Summary
6. Display up to 3 deposits in Financial/Trust Details section

---

## Color Palette (from reference)

| Section | Color | Hex Code |
|---------|-------|----------|
| Section Headers | Light Blue | `#B4C7DC` |
| Party Info Background | Yellow/Cream | `#FFF9E6` |
| Commission/Financial Area | Sage Green | `#D5E8D4` |
| Comments Background | Pink/Salmon | `#FFE6E6` |
| Calculation Notes Strip | Light Yellow | `#FFFACD` |
| Borders | Black | `#000000` |

---

## Layout Structure

```text
+--------------------------------------------------+
| [CLEARVIEW LOGO]                                 |
|                                                  |
| sale/lease dealsheet                             |
| Deal #: ________    Date: January 28, 2026       |
+--------------------------------------------------+
| PROPERTY / DEAL SUMMARY (blue header)            |
| +------------------------------------------------+
| | Property Address: | Closing: | Sale/Lease Price|
| | [address]         | [date]   | [amount]        |
| | Premises Size:    | Key Conditions & Dates...  |
| | [size SF]         | 1. [condition] - [date]    |
| +------------------------------------------------+
+--------------------------------------------------+
| SELLER INFO (yellow)  | BUYER INFO (yellow)      |
| Name:                 | Name:                     |
| Address: c/o ...      | Address: c/o ...          |
| Contact:              | Contact:                  |
| Phone:                | Phone:                    |
| Email:                | Email:                    |
+--------------------------------------------------+
| AGENCY & COMMISSION SUMMARY (blue header)        |
| Listing Agent(s):     | Leasing/Selling Agent(s): |
| [agents/brokerage]    | [agents/brokerage]        |
+--------------------------------------------------+
| Commission Calculation Notes: [formula] (yellow) |
+--------------------------------------------------+
| TOTAL COMMISSION (green) | FINANCIAL/TRUST (green)|
| Commission (excl GST):   | 1st Deposit: [amt]     |
| GST on Commission:       |   Held By: [holder]    |
| Total (incl GST):        | 2nd Deposit: [amt]     |
|                          |   Held By: [holder]    |
| OTHER BROKERAGE - X%     | 3rd Deposit: [amt]     |
| Commission/GST/Total     |   Held By: [holder]    |
|                          |                        |
| CLEARVIEW - X%           |                        |
| Commission/GST/Total     |                        |
+--------------------------------------------------+
| COMMENTS (pink background)                       |
| [comments text]                                  |
+--------------------------------------------------+
```

---

## Technical Implementation

### File: `src/components/documents/DealSheetPDF.tsx`

#### 1. Update Color Constants

**Replace:**
```typescript
const BRAND_GOLD = '#C4A052';
const BRAND_DARK = '#1a1a1a';
const BRAND_GRAY = '#666666';
const BRAND_LIGHT_GRAY = '#f5f5f5';
```

**With:**
```typescript
const BLUE_HEADER = '#B4C7DC';
const YELLOW_BG = '#FFF9E6';
const GREEN_BG = '#D5E8D4';
const PINK_BG = '#FFE6E6';
const YELLOW_NOTES = '#FFFACD';
const BLACK = '#000000';
const DARK_TEXT = '#1a1a1a';
const GRAY_TEXT = '#666666';
```

#### 2. Update Styles

Complete style overhaul including:

**Header:** Remove gold border, keep logo left-aligned

**Section Headers:** Blue background with black text, bordered

**Property Summary:** Table with black borders containing:
- Row 1: Property Address | Closing Date | Sale/Lease Price
- Row 2: Premises Size | Key Conditions (spanning 2 columns)

**Party Sections:** Yellow background with black borders, side-by-side for Seller/Buyer

**Agency Section:** Blue header, two-column layout for agents

**Commission Notes:** Yellow background strip with calculation formula

**Commission/Financial:** Two-column green background area:
- Left: Commission breakdown (Total, Other Brokerage, Clearview)
- Right: Financial/Trust Details with up to 3 deposits

**Comments:** Pink background section

#### 3. Update Title (Line 282)

**Change from:**
```tsx
<Text style={styles.mainTitle}>CLEARVIEW {dealTypeLabel} DEALSHEET</Text>
```

**To:**
```tsx
<Text style={styles.mainTitle}>sale/lease dealsheet</Text>
```

#### 4. Restructure Property/Deal Summary

Create bordered table layout with cells:
- Property Address spanning left portion
- Closing Date in middle
- Sale Price/Lease Value on right
- Premises Size on left of second row
- Key Conditions & Removal Dates spanning right portion of second row

#### 5. Update Party Information Sections

- Add yellow background (`#FFF9E6`)
- Add black borders
- Keep side-by-side layout for Seller/Buyer

#### 6. Add Financial/Trust Details

New section within the green commission area displaying:
- 1st Deposit Received: [amount] / Held By: [holder]
- 2nd Deposit Received: [amount] / Held By: [holder]
- 3rd Deposit Received: [amount] / Held By: [holder]

Using the `deposits` prop already passed to the component

#### 7. Update Comments Section

Change background color from gray to pink (`#FFE6E6`)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/documents/DealSheetPDF.tsx` | Complete redesign - colors, layout, title, deposits display |

---

## Summary of Changes

1. **Title**: Static "sale/lease dealsheet" (lowercase as shown in reference)
2. **Date**: Already auto-populates today's date - no change needed
3. **Colors**: Blue headers, yellow party info, green financials, pink comments
4. **Layout**: Bordered tables, side-by-side sections matching reference
5. **Deposits**: Display up to 3 deposits in Financial/Trust Details section
6. **Logo**: Keep Clearview logo in top left position

