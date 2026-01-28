
# Redesign Deal Sheet PDF to New Specification

## Overview
Complete rewrite of `DealSheetPDF.tsx` to match the new layout specification with updated colors, structure, and styling.

---

## Key Changes Summary

| Area | Current | New |
|------|---------|-----|
| Colors | Blue headers, Yellow/Pink sections | Gray headers, Yellow seller, Blue buyer, Green agency |
| Header | Logo left, lowercase title | Logo left, UPPERCASE title |
| Summary Table | Custom styling | Gray background label rows |
| Party Sections | Yellow background both | Yellow seller, Blue buyer |
| Agency Section | White background | Green background |
| Comments | Pink background | Simple border with underlined title |

---

## New Color Palette

```typescript
const colors = {
  headerBg: '#f5f5f5',      // Gray - label cells
  yellowBg: '#fffde7',      // Seller section
  blueBg: '#e3f2fd',        // Buyer section  
  greenBg: '#e8f5e9',       // Agency section
  border: '#333333',        // Dark borders
  lightBorder: '#cccccc',   // Light borders
};
```

---

## Structural Changes

### 1. Header Section
- Logo on left (180x40px)
- Right side: UPPERCASE title "{DEAL_TYPE} DEALSHEET"
- Deal # and Date fields below title

### 2. Property/Deal Summary Table
- Section title: "PROPERTY / DEAL SUMMARY" (underlined, bold)
- 4-row table with outer dark border
- Row 1 (Labels): Gray background - Property Address, Closing Date, Sale Price/Lease Value
- Row 2 (Values): Data values
- Row 3 (Labels): Gray background - Premises Size, Key Conditions & Removal Dates
- Row 4 (Values): Size SF, Numbered conditions list

### 3. Seller & Buyer Information (Two Columns)
- **Left Column (Seller)**: Yellow background (#fffde7)
  - Title: "SELLER INFORMATION" (underlined)
  - Fields: Name, Address (c/o brokerage), Contact, Phone, Email

- **Right Column (Buyer)**: Blue background (#e3f2fd)
  - Title: "BUYER INFORMATION" (underlined)
  - Same field structure

### 4. Agency & Commission Summary (Two Columns)
- **Green background (#e8f5e9)** for both columns
- Left: "Listing Agent(s) / Brokerage:"
- Right: "Selling Agent(s) / Brokerage:" (or "Leasing" for lease deals)

### 5. Commission Calculation Notes
- Simple text: "Commission Calculation Notes: [value] x [percent]%"
- Bold, underlined

### 6. Commission Details (Two Columns)
**Left Column - Commission Calculations:**
- TOTAL COMMISSION (underlined title)
  - Commission (excl. GST): [value]
  - GST on Commission: [value]
  - Total Commission (incl. GST): [bold value]

- OTHER BROKERAGE PORTION - [X]%
  - Commission (excl. GST): [value]
  - GST: [value]
  - Total: [bold]

- CLEARVIEW PORTION - [X]%
  - Same structure

**Right Column - Deposits:**
- FINANCIAL / TRUST DETAILS (underlined title)
- 1st Deposit: [amount] Held By: [holder]
- 2nd Deposit: (if exists)
- 3rd Deposit: (if exists)

### 7. Comments Section
- Simple border with underlined "COMMENTS" title
- `wrap={false}` to ensure it flows to second page if needed

---

## Technical Implementation

### File: `src/components/documents/DealSheetPDF.tsx`

**Complete rewrite with:**

1. **New color constants**
2. **New StyleSheet** following the provided specification exactly
3. **Updated component structure** matching the layout

### Format Functions to Add
```typescript
// Currency (CAD with 2 decimals)
const formatCurrencyCAD = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '';
  return new Intl.NumberFormat('en-CA', { 
    style: 'currency', 
    currency: 'CAD', 
    minimumFractionDigits: 2 
  }).format(value);
};

// Date (January 28, 2026 format)
const formatDateLong = (date: string | null | undefined) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-CA', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

// Today's date formatted
const getTodayFormatted = () => {
  return new Date().toLocaleDateString('en-CA', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};
```

### Conditions Formatting
```typescript
const conditionsText = conditions.map((c, i) => 
  `${i + 1}) ${c.description}${c.due_date ? ` – Removal by ${formatDateLong(c.due_date)}` : ''}`
).join('\n');
```

---

## Files to Modify

1. **`src/components/documents/DealSheetPDF.tsx`** - Complete rewrite with new specification
   - Replace color palette
   - Replace StyleSheet with new styles
   - Restructure component layout
   - Add new format functions
   - Update title to uppercase dynamic
   - Update party sections with correct background colors
   - Update agency section with green background
   - Simplify comments section styling

---

## Visual Layout Reference

```text
┌──────────────────────────────────────────────────────────────┐
│ [LOGO]                              SALE DEALSHEET           │
│                                     Deal #: 12345            │
│                                     Date: January 28, 2026   │
├──────────────────────────────────────────────────────────────┤
│ PROPERTY / DEAL SUMMARY                                      │
├──────────────────────────────────────────────────────────────┤
│ Property Address: │ Closing Date: │ Sale Price:              │
│ 123 Main St       │ Feb 15, 2026  │ $1,500,000               │
├───────────────────┴───────────────┴──────────────────────────┤
│ Premises Size:    │ Key Conditions & Removal Dates:          │
│ 15,000 SF         │ 1) Financing – Removal by Jan 30, 2026   │
│                   │ 2) Inspection – Removal by Feb 1, 2026   │
├───────────────────┴──────────────────────────────────────────┤
│ SELLER INFORMATION (Yellow)  │ BUYER INFORMATION (Blue)      │
│ Name: ABC Corp               │ Name: XYZ Inc                 │
│ Address: c/o Brokerage       │ Address: c/o Brokerage        │
│ Contact: John Smith          │ Contact: Jane Doe             │
│ Phone: 555-1234              │ Phone: 555-5678               │
│ Email: john@email.com        │ Email: jane@email.com         │
├──────────────────────────────┴───────────────────────────────┤
│ AGENCY & COMMISSION SUMMARY (Green)                          │
│ Listing Agent(s):            │ Selling Agent(s):             │
│ John Smith / ABC Realty      │ Jane Doe / XYZ Realty         │
├──────────────────────────────────────────────────────────────┤
│ Commission Calculation Notes: $1,500,000 x 3%                │
├──────────────────────────────┬───────────────────────────────┤
│ TOTAL COMMISSION             │ FINANCIAL / TRUST DETAILS     │
│ Commission (excl. GST): $45K │ 1st Deposit: $50,000          │
│ GST: $2,250                  │   Held By: ABC Trust          │
│ Total: $47,250               │ 2nd Deposit: $100,000         │
│                              │   Held By: ABC Trust          │
│ OTHER BROKERAGE – 1.5%       │                               │
│ ...                          │                               │
│                              │                               │
│ CLEARVIEW – 1.5%             │                               │
│ ...                          │                               │
├──────────────────────────────┴───────────────────────────────┤
│ COMMENTS                                                     │
│ [deal notes text here]                                       │
└──────────────────────────────────────────────────────────────┘
```
