
## Understanding the problem

The label derivation logic is spread across 4 places. Currently `isLease` is `['lease', 'sublease', 'renewal'].includes(...)` which groups all three together and produces "Landlord"/"Tenant". Sublease needs distinct labels: **"Sublandlord"** / **"Subtenant"**.

### Files affected

**1. `src/components/deals/DealFormDialog.tsx` (line 429–430)**
- `sellerLabel` and `buyerLabel` derivation
- Currently: `isLeaseDeal ? 'Landlord' : ...`
- Fix: if `Sublease` → `'Sublandlord'` / `'Subtenant'`; if Lease/Renewal → `'Landlord'` / `'Tenant'`

**2. `src/components/deals/GenerateDealSheetDialog.tsx` (lines 103–105)**
- `sellerLabel` and `buyerLabel` are computed without any lease check at all
- Currently: `usePV ? 'Vendor' : 'Seller'` / `usePV ? 'Purchaser' : 'Buyer'`
- Fix: add deal-type-aware labels: Sublease → `'Sublandlord'`/`'Subtenant'`, Lease/Renewal → `'Landlord'`/`'Tenant'`

**3. `src/components/documents/DealSheetPDF.tsx` (lines 159–164)**
- `sellerLabel` / `buyerLabel` derivation
- Currently: `isLease ? 'Landlord' : ...`
- Fix: check for `sublease` specifically → `'Sublandlord'`/`'Subtenant'`; Lease/Renewal → `'Landlord'`/`'Tenant'`

**4. `src/components/documents/DealSummaryPDF.tsx` (lines 184–187)**
- Same `isLease ? 'Landlord'` pattern, reads `dealType` prop
- Fix: same sublease-specific check

**5. `src/components/deals/detail/DealPartiesSection.tsx`**
- Labels are completely hardcoded as "Seller" / "Buyer" — no deal-type awareness at all
- Fix: accept `deal` prop (already has it via `deal: Deal`) and derive labels dynamically

### Label derivation helper (shared pattern)

Create a simple inline helper used in all 5 locations:

```
const dealTypeLower = deal.deal_type?.toLowerCase();
const isSublease = dealTypeLower === 'sublease';
const isLeaseType = ['lease', 'sublease', 'renewal'].includes(dealTypeLower || '');

const sellerLabel = isSublease ? 'Sublandlord' : isLeaseType ? 'Landlord' : (usePV ? 'Vendor' : 'Seller');
const buyerLabel  = isSublease ? 'Subtenant'   : isLeaseType ? 'Tenant'   : (usePV ? 'Purchaser' : 'Buyer');
```

### Summary of changes
- **5 file edits** — DealFormDialog, GenerateDealSheetDialog, DealSheetPDF, DealSummaryPDF, DealPartiesSection
- **No migrations needed** — purely label/display logic
- All PDFs (Deal Sheet and Deal Summary) will automatically render "Sublandlord"/"Subtenant" when the deal type is Sublease
- The parties section in the deal detail view will also correctly display "Sublandlord"/"Subtenant"
