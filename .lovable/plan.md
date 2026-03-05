
## Plan: Multi-Year Lease Rates for Lease & Sublease Deals

### What we're building
For Lease and Sublease deals, replace the single "Lease Rate PSF" field with a **year-by-year rate schedule**. Each year has a rate ($/SF) and the system automatically allocates months to each year based on the total lease term, handling partial final years. Deal Value is auto-calculated from this schedule.

---

### Data storage strategy
Store the rate schedule as a JSONB column `lease_rates` on the `deals` table. Each entry:
```json
[
  { "year": 1, "rate_psf": 12.50, "months": 12 },
  { "year": 2, "rate_psf": 12.75, "months": 8 }
]
```
The existing `lease_rate_psf` column is kept and will store the **weighted average rate** for backwards compatibility (used in transactions auto-creation and display summaries).

**Migration:** Add `lease_rates jsonb` column to `deals` table.

---

### Deal Value calculation logic (shared helper)

```ts
// months per year auto-distributed from lease_term_months
// Year 1..N-1 get 12 months each; last year gets the remainder
function calcLeaseValue(rates: LeaseRateYear[], sizeSf: number, termMonths: number): number {
  return rates.reduce((sum, r) => sum + (r.rate_psf * sizeSf * r.months / 12), 0);
}
```

**Auto-distribute months**: When the user adds a new year, the system splits `lease_term_months` across years: full 12-month years, with any remainder going to the last year. Months per year are **editable** — the user can manually adjust (e.g., Year 1 = 8 months, Year 2 = 12 months) and the total is shown vs. the lease term.

---

### Files to change

**1. Database migration**
Add `lease_rates jsonb` column to the `deals` table.

**2. `src/types/database.ts`**
Add `LeaseRateYear` interface and `lease_rates` field to `Deal` and `DealFormData`.

**3. `src/components/deals/DealFormDialog.tsx`**
- Replace single "Lease Rate PSF" input with a `LeaseRateSchedule` inline component (rendered in-form, no new file needed — keep it self-contained)
- The schedule shows a table:
  ```
  Year | Rate PSF | Months | Annual Value | [Delete]
    1  | $12.50   |   12   | $X,XXX,XXX  |
    2  | $12.75   |    8   | $X,XXX,XXX  | [×]
       [+ Add Year]         Total: $X,XXX,XXX
  ```
- When rates/months change → auto-calc `deal_value` and set `lease_rate_psf` = weighted average
- On form submit: persist `lease_rates` JSONB alongside existing fields

**4. `src/hooks/useDeals.ts`**
- Pass `lease_rates` through in `useCreateDeal` and `useUpdateDeal` mutations
- When auto-creating a transaction on deal close, set `lease_rate_psf` to the stored weighted average

**5. `src/components/deals/detail/DealBasicSection.tsx`** (read-only display in deal detail)
- Currently shows a single "Lease Rate PSF" input as disabled
- When `lease_rates` has entries: replace with a compact rate schedule table (read-only)
- Show each year, rate, months, and line-item value

**6. `src/components/deals/GenerateDealSheetDialog.tsx`**
- In the `basic` tab: when `isLeaseType`, show the multi-year rate schedule (same editable table UI) pre-populated from `deal.lease_rates`
- `dealValue` state is computed from the schedule

**7. `src/components/documents/DealSheetPDF.tsx`**
- Replace the single "Lease Rate PSF" property row with a year-by-year lease rate table:
  ```
  Lease Rate Schedule
  Year 1: $12.50/SF × 12 months = $XXX,XXX
  Year 2: $12.75/SF × 8 months  = $XXX,XXX
  Total Lease Value: $X,XXX,XXX
  ```

**8. `src/components/documents/DealSummaryPDF.tsx` + `GenerateDealSummaryDialog.tsx`**
- Pass `leaseRates` prop through `DealSummaryPDFProps`
- In the Property Details table: replace single rate row with the rate schedule breakdown (same style as Deal Sheet PDF)

---

### Key UX details
- "Lease Rate PSF" field disappears when `lease_rates.length > 0`; falls back to single rate input if the schedule is empty (backward compat for existing deals)
- Month distribution is auto-calculated on "Add Year" but manually editable
- A running total `X of Y months` indicator warns if the schedule doesn't add up to the term
- Deal Value field becomes **read-only / auto-calculated** when `lease_rates.length > 0`; shows as a computed output with a "Calculated from rate schedule" note
- For existing deals with only `lease_rate_psf` set, the form renders as single-rate mode (no schedule table) — no data migration needed

---

### Summary
- **1 migration** — add `lease_rates jsonb` to `deals`
- **6 file edits** — DealFormDialog, useDeals, DealBasicSection, GenerateDealSheetDialog, DealSheetPDF, DealSummaryPDF + GenerateDealSummaryDialog
- **1 type update** — database.ts
