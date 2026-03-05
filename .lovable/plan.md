
## What's wrong

The `GenerateDealSummaryDialog` "Basic Info" tab uses **hardcoded purchase-oriented field labels and variable names** regardless of deal type. The PDFs themselves already handle the label switching correctly (Landlord/Tenant etc.) but the **dialog forms feeding into them still show sale-centric terminology**.

### Issues found across both dialogs + PDFs

---

### 1. `GenerateDealSummaryDialog.tsx` — Basic Info tab (lines 860–965)

**Field labels are hardcoded for a sale:**
- `vendor` state variable / label: always shows **"Seller"** or **"Vendor"** — should be **"Sublandlord"** / **"Landlord"** for lease types
- `purchaser` state variable / label: always shows **"Buyer"** or **"Purchaser"** — should be **"Subtenant"** / **"Tenant"** for lease types
- Field label `Purchase Price` (line 954) — should be **"Deal Value"** for lease types
- `Closing Date` label (line 927) — should be **"Possession Date"** for lease types

**"Acting Party" dropdown in the Actions section (lines 794–797) is hardcoded:**
```tsx
<SelectItem value="Vendor">Vendor</SelectItem>
<SelectItem value="Purchaser">Purchaser</SelectItem>
<SelectItem value="Both">Both</SelectItem>
```
For lease types should be **Landlord/Tenant** (or Sublandlord/Subtenant), for sale should respect the Vendor/Purchaser vs Seller/Buyer toggle.

**Financial summary sidebar in Deposits tab (lines 983–990):**
- `Purchase Price:` label hardcoded — should be `Deal Value` for leases

---

### 2. `GenerateDealSummaryDialog.tsx` — Missing lease fields in Basic Info tab

For a Lease/Sublease deal, the Basic Info tab currently shows no lease-specific fields. There is no way to enter or confirm:
- Commencement Date
- Expiry Date
- Lease Term

These need to be added (pre-populated from the deal) when `isLeaseType` is true, replacing or supplementing `Effective Date` and `Closing Date`.

---

### 3. `GenerateDealSheetDialog.tsx` — Basic tab (line 521–546)

The `Closing Date` label is **always "Closing Date"** — should be **"Possession Date"** for lease types (already correct in the PDF but not in the dialog form).

---

### 4. `DealSummaryPDF.tsx` — "Closing Details" section (line 339) and timeline (line 206)

- Line 339: `{isLease ? 'Deal Value' : 'Purchase Price'}` — already correct ✓
- Line 206 (timeline): closing detail text says `"Closing — Balance of..."` — for lease deals it should say `"Possession — Balance of..."` 
- Line 199: commencement date entry says `"Effective Date — Agreement executed"` — for lease should say `"Commencement Date — Lease commences"`

---

### Summary of all changes needed

**`GenerateDealSummaryDialog.tsx`** — 5 fixes:
1. Add lease-type awareness: `const isSublease / isLeaseType / sellerLabel / buyerLabel` computed from `deal.deal_type`
2. "Seller/Vendor" label → `sellerLabel` (Sublandlord / Landlord / Seller / Vendor)
3. "Buyer/Purchaser" label → `buyerLabel`  
4. "Purchase Price" label → `isLeaseType ? 'Deal Value' : (usePV ? 'Purchase Price' : 'Purchase Price')`
5. "Closing Date" label → `isLeaseType ? 'Possession Date' : 'Closing Date'`
6. Add commencement/expiry date fields (pre-populated) when `isLeaseType`, alongside or replacing the Effective Date
7. "Acting Party" dropdown options → derive from deal type: Sublandlord/Subtenant, Landlord/Tenant, or Vendor/Purchaser or Seller/Buyer
8. "Purchase Price:" in deposits sidebar → `isLeaseType ? 'Deal Value' : 'Purchase Price'`

**`GenerateDealSheetDialog.tsx`** — 1 fix:
1. "Closing Date" label (line 521) → `isLeaseType ? 'Possession Date' : 'Closing Date'`

**`DealSummaryPDF.tsx`** — 2 fixes:
1. Timeline closing entry (line 206): `"Closing — ..."` → `isLease ? "Possession — ..." : "Closing — ..."`
2. Timeline commencement entry (line 199): label when `isLease` should say `"Commencement Date — Lease commences"` rather than `"Effective Date — Agreement executed"`

**`DealSheetPDF.tsx`** — already correct (no changes needed)

---

### No migrations needed — all UI/label changes only

### Files to edit: 3
- `src/components/deals/GenerateDealSummaryDialog.tsx`
- `src/components/deals/GenerateDealSheetDialog.tsx`  
- `src/components/documents/DealSummaryPDF.tsx`
