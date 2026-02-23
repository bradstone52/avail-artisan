

## Remove "Expansion" Deal Type

Remove "Expansion" from the available deal types, keeping the remaining four: **Lease**, **Sale**, **Sublease**, **Renewal**.

### Changes

**1. `src/types/database.ts`**
- Update `DealType` from `'Lease' | 'Sale' | 'Sublease' | 'Renewal' | 'Expansion'` to `'Lease' | 'Sale' | 'Sublease' | 'Renewal'`

**2. `src/components/deals/DealFormDialog.tsx`**
- Remove `'Expansion'` from the `dealTypes` array
- Remove `'Expansion'` from the `isLeaseDeal` check

**3. `src/components/deals/detail/DealBasicSection.tsx`**
- Remove `'Expansion'` from the `dealTypes` array
- Remove `'Expansion'` from the lease-type check on the display conditional

**4. `src/components/documents/DealSheetPDF.tsx`**
- Remove `'expansion'` from the `isLease` check

**5. `src/components/documents/DealSummaryPDF.tsx`**
- Remove `'expansion'` from the `isLease` check

### Existing Data
Any existing deals already saved with the "Expansion" type will remain in the database and display correctly, but "Expansion" will no longer appear as an option when creating or editing deals.

