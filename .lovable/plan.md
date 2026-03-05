

## Overview

Add **Free Rent** support to Lease and Sublease deal types. Free Rent months live inside the lease term and come in two flavours — **Net Free** (only base rent is waived) and **Gross Free** (rent + op costs waived). This affects the **Net Lease/Sublease Value** calculation because free months reduce the total rent collected.

The feature touches 5 areas:
1. **Database** — add `free_rent_months` JSONB column to `deals` table
2. **Type definitions** — extend `LeaseRateYear` / `Deal` types + calculation helper
3. **Deal Form** — add Free Rent input UI inside the lease section
4. **Deal value auto-recalculation** — subtract free rent from `deal_value`
5. **Deal Summary PDF** — show Free Rent in Property Details and reflect adjusted value

---

## Data Model

Free rent entries stored as a JSONB array on `deals.free_rent_months`:

```text
[
  { "type": "Net Free",   "months": 2, "year": 1 },
  { "type": "Gross Free", "months": 1, "year": 2 }
]
```

`year` identifies which year's rate applies to the deducted value (since Year 1 rate may differ from Year 3 rate). For **Net Free**, the deduction = `rate_psf × size_sf × months / 12` for that year. For **Gross Free**, the same deduction applies (op costs are external and not part of the lease value calculation already, so the deduction formula is identical — op costs aren't in `deal_value`).

---

## Calculation

```text
Current: deal_value = Σ (rate_psf × size_sf × months / 12) per year

New:     deal_value = [above] − Σ (rate_psf_for_year × size_sf × free_months / 12) per free_rent entry
```

New helper `calcFreeRentDeduction(freeRent, rates, sizeSf)` in `src/types/database.ts`.

---

## Files to Change

**1. Database migration**
- `ALTER TABLE deals ADD COLUMN IF NOT EXISTS free_rent_months jsonb`

**2. `src/types/database.ts`**
- Add `FreeRentEntry` interface `{ type: 'Net Free' | 'Gross Free'; months: number; year: number }`
- Add `free_rent_months?: FreeRentEntry[] | null` to `Deal` and `DealFormData`
- Add `calcFreeRentDeduction(freeRent, rates, sizeSf)` helper
- Update `calcLeaseValue` export to remain unchanged (deduction applied at call site)

**3. `src/components/deals/DealFormDialog.tsx`**
- Add `free_rent_months` to `ExtendedDealFormData` and `EMPTY_FORM`
- Add UI block inside the `isLeaseDeal` section (below Lease Rate Schedule), with:
  - "Add Net Free" and "Add Gross Free" buttons
  - Each entry shows: Type badge, Year selector (matches existing rate years), Months input, Delete button
- Update `deal_value` auto-recalculation effect to subtract free rent deduction
- Pass `free_rent_months` through `handleSubmit`

**4. `src/hooks/useDeals.ts`**
- Pass `free_rent_months` through in `useCreateDeal` and `useUpdateDeal` sanitization

**5. `src/components/documents/DealSummaryPDF.tsx`**
- Add `freeRentMonths` prop to `DealSummaryPDFProps`
- In Property Details table, add a row showing free rent summary (e.g. "2 mo Net Free (Yr 1), 1 mo Gross Free (Yr 2)")
- Update the `Net Lease/Sublease Value` financial card to show the adjusted (reduced) value
- Add a small note line below the value card: "Incl. X mo Net Free / Y mo Gross Free"

**6. `src/components/deals/GenerateDealSummaryDialog.tsx`**
- Pass `freeRentMonths={(deal as any).free_rent_months}` to `<DealSummaryPDF />`

---

## UI Sketch (Deal Form — Free Rent block)

```text
┌─────────────────────────────────────────────────────────┐
│  Free Rent                              [+ Net Free] [+ Gross Free]│
├───────┬──────────────────┬────────┬────────────────────┤
│ Type  │ Applies to Year  │ Months │                    │
├───────┼──────────────────┼────────┼────────────────────┤
│ Net   │ [Year 1 ▾]       │ [ 2  ] │ [🗑]               │
│ Gross │ [Year 1 ▾]       │ [ 1  ] │ [🗑]               │
└───────┴──────────────────┴────────┴────────────────────┘
  Deal Value adjusts live to reflect free rent deduction
```

The year selector is populated from the existing `lease_rates` schedule years so the system knows which rate PSF to use for the deduction.

---

## Key Constraints

- Only visible when `deal_type` is `Lease` or `Sublease`
- Year selector only shows years that exist in the rate schedule (or "Year 1" if flat rate is used)
- `deal_value` auto-recalculates whenever free rent entries change (same reactive effect as rate schedule changes)
- Free rent does **not** affect `lease_term_months` — it's months inside the term, not additive
- The Gross Free deduction on deal value uses the same base rent PSF (op costs are not tracked in the lease value)

