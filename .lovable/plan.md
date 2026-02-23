

## Lease-Specific Deal Form + PDF Changes

### 1. Database Migration

Add four columns to the `deals` table:

```sql
ALTER TABLE deals
  ADD COLUMN lease_rate_psf numeric,
  ADD COLUMN lease_term_months integer,
  ADD COLUMN commencement_date date,
  ADD COLUMN expiry_date date;
```

### 2. Type Updates (`src/types/database.ts`)

Add `lease_rate_psf`, `lease_term_months`, `commencement_date`, `expiry_date` to both `Deal` and `DealFormData` interfaces.

### 3. Form Changes (`src/components/deals/DealFormDialog.tsx`)

Define `isLeaseDeal` when deal type is Lease, Sublease, Renewal, or Expansion:

- **Labels**: Seller becomes "Landlord", Buyer becomes "Tenant" (parties, brokerages, lawyers)
- **Hide**: Purchaser/Vendor toggle for lease deals
- **New fields** (lease only): Lease Rate PSF ($/SF), Lease Term (months), Commencement Date, Expiry Date
- **Relabel**: "Effective Date" becomes "Commencement Date" for lease deals
- **Keep**: Deal Value and Commission fields visible for all deal types
- Add new fields to `EMPTY_FORM`, form initialization, and submit handler

### 4. Hook Updates (`src/hooks/useDeals.ts`)

Include new fields in create/update mutations, sanitizing nulls for dates.

### 5. Detail View (`src/components/deals/detail/DealBasicSection.tsx`)

Display lease-specific fields (Lease Rate PSF, Lease Term, Commencement Date, Expiry Date) when present.

### 6. Deal Sheet PDF (`src/components/documents/DealSheetPDF.tsx`)

- Expand `isLease` to match Sublease, Renewal, Expansion (case-insensitive)
- Override labels: Landlord/Tenant for lease deals (ignoring Purchaser/Vendor toggle)
- "Selling Brokerage" becomes "Leasing Brokerage", "Selling Agent" becomes "Leasing Agent"
- Keep "Deal Value" (not "Lease Value") for lease deals
- Add Property Details rows: Lease Rate PSF, Lease Term, Commencement Date, Expiry Date
- Relabel "Closing Date" to "Possession Date" for lease deals

### 7. Deal Summary PDF (`src/components/documents/DealSummaryPDF.tsx`)

- Add new props: `dealType`, `leaseRatePsf`, `leaseTermMonths`, `commencementDate`, `expiryDate`
- Same label logic as Deal Sheet (Landlord/Tenant, Leasing Agent, etc.)
- Add lease field rows in Property Details
- Relabel "Effective Date" to "Commencement Date"

### 8. Deal Summary Dialog (`src/components/deals/GenerateDealSummaryDialog.tsx`)

- Pass new deal fields to `DealSummaryPDF` component

