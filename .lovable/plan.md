
## Summary of all issues found

### Issue 1 — "Possession Date" → "Occupancy Date"
**Files:** `GenerateDealSummaryDialog.tsx` (line 964), `GenerateDealSheetDialog.tsx` (line 521), `DealSummaryPDF.tsx` (line 206 timeline detail text)

### Issue 2 — "Deal Value" → "Net Lease Value" / "Net Sublease Value"
A new derived label is needed:
```ts
const netLeaseLabel = isSublease ? 'Net Sublease Value' : 'Net Lease Value';
const dealValueLabel = isLeaseType ? netLeaseLabel : 'Purchase Price';
```
**Everywhere** this label appears needs updating:
- `GenerateDealSummaryDialog.tsx` line 1013: field label "Deal Value"
- `GenerateDealSummaryDialog.tsx` line 1042: deposits sidebar "Deal Value:"
- `GenerateDealSummaryDialog.tsx` line 1046: "Balance on Possession:" line (see Issue 3)
- `DealSummaryPDF.tsx` line 299: Financial Summary card label `isLease ? 'Deal Value' : 'Purchase Price'`
- `DealSummaryPDF.tsx` line 339: Closing Details table row `isLease ? 'Deal Value' : 'Purchase Price'`

### Issue 3 — Deposits tab sidebar: remove "Balance on Possession/Closing" for leases
Currently the deposits tab shows:
- Total Deposits
- Deal Value
- **Balance on Possession** (purchasePrice − totalDeposits)

For lease deals, the "Balance on Possession" concept doesn't apply. Per the user's note, deposits for leases are typically one-month's gross rent + security deposit held for the term. The sidebar for lease deals should show:
- Total Deposits
- Net Lease Value (no balance line)

**File:** `GenerateDealSummaryDialog.tsx` lines 1036–1049

### Issue 4 — Deal Value not carrying through to Generate Deal Sheet financial tab
**Root cause:** Line 94 of `GenerateDealSheetDialog.tsx`: `const [dealValue, setDealValue] = useState(deal.deal_value || 0)`. This is correct — `deal.deal_value` is read. But the financial tab's commission calculations (lines 172–178) depend on `dealValue` state, which should work.

However, the real issue is that for a **new** sublease deal, `deal.deal_value` may be `null` at the point the dialog is opened. The `|| 0` default means commission displays as $0 and appears broken. The fix is to add a `useEffect` that updates `dealValue` when `deal.deal_value` changes (i.e., after the parent refetches post-save):
```ts
useEffect(() => {
  if (open) setDealValue(deal.deal_value ?? 0);
}, [open, deal.deal_value]);
```
This ensures when the dialog opens after a deal has been saved with a calculated value, it picks up the latest value.

### Issue 5 — PDF: Financial Summary section for lease deals
**Current:** 3 cards: `Deal Value | Total Deposits | Balance on Closing`  
**Required for lease:** 2 cards only: `Net Lease Value | Total Deposits`

**File:** `DealSummaryPDF.tsx` lines 294–311 — conditionally render the third "Balance on Closing" card only when `!isLease`.

### Issue 6 — PDF: "Closing Details" section for lease deals — remove it
**Current:** Always shows `Deal Value | Balance Due on Closing | Closing Date`  
**Required:** For lease deals, remove this entire section. Keep it for sale deals.

**File:** `DealSummaryPDF.tsx` lines 336–350 — wrap in `{!isLease && (...)}`.

---

## Files to change: 3

### `src/components/deals/GenerateDealSummaryDialog.tsx`
1. Add `netLeaseLabel` / `dealValueLabel` computed vars (after existing `actingPartyOptions`)
2. Line 1013: "Deal Value" field label → `{dealValueLabel}`
3. Lines 1036–1049: Deposits sidebar — remove "Balance" row for lease; show `netLeaseLabel` as label, no balance line
4. Line 964: "Possession Date" → "Occupancy Date"

### `src/components/deals/GenerateDealSheetDialog.tsx`
1. Line 521: `'Possession Date'` → `'Occupancy Date'`
2. Add `useEffect` to sync `dealValue` from `deal.deal_value` when dialog opens

### `src/components/documents/DealSummaryPDF.tsx`
1. Add `netLeaseLabel` derived from `isSublease`
2. Line 206 timeline: `'Possession'` → `'Occupancy'`
3. Lines 297–310 Financial Summary: show only 2 cards for lease (Net Lease Value + Total Deposits, no Balance on Closing)
4. Lines 336–350 Closing Details section: wrap entire block in `{!isLease && (...)}`
5. Lines 299 & 339: use `netLeaseLabel` / `dealValueLabel` for the value label
