
## Root Cause

There are **two related bugs** preventing deal value from populating on a Sublease deal:

**Bug 1 — Stale closure on `size_sf` in the schedule `onChange`**
In `DealFormDialog.tsx` lines 657-662, the `onChange` callback for `LeaseRateSchedule` captures `formData.size_sf` from the render-time closure:
```ts
onChange={(rates) => {
  const sf = formData.size_sf ?? 0;  // ← stale closure!
  const newValue = sf > 0 ? calcLeaseVal(rates, sf) : undefined;
  ...
}}
```
If the user enters/changes `size_sf` after the schedule section first renders, `sf` is stale and `deal_value` computes as `undefined`.

**Bug 2 — No recalculation when `size_sf` changes while a schedule exists**
There is no `useEffect` watching `formData.size_sf` that would recompute `deal_value` when the schedule is already populated. So if the user enters size before or after adding years to the schedule, and the stale value was `0`, the deal value is never updated.

Also — `'Lease Renewal'` is not in the `isLeaseDeal` check (line 370) or `dealTypes` array (line 98), but that's a pre-existing separate issue and not causing this bug.

---

## Fix

**File: `src/components/deals/DealFormDialog.tsx`**

**Fix 1** — Use `setFormData` functional updater in the schedule `onChange` to always read the latest `size_sf`:

```ts
onChange={(rates) => {
  setFormData(prev => {
    const sf = prev.size_sf ?? 0;
    const newValue = sf > 0 ? calcLeaseVal(rates, sf) : undefined;
    const avgRate = weightedAvg(rates);
    return { ...prev, lease_rates: rates, deal_value: newValue, lease_rate_psf: avgRate || undefined };
  });
}}
```

**Fix 2** — Add a `useEffect` to recalculate `deal_value` when `size_sf` changes and a schedule is active:

```ts
useEffect(() => {
  const rates = formData.lease_rates;
  if (!rates?.length) return;
  const sf = formData.size_sf ?? 0;
  const newValue = sf > 0 ? calcLeaseVal(rates, sf) : undefined;
  setFormData(prev => ({ ...prev, deal_value: newValue }));
}, [formData.size_sf]);
```

Also fix the "Use Rate Schedule" button's `onClick` (lines 677-684) similarly to use the latest `size_sf`.

**Files to change: 1**
- `src/components/deals/DealFormDialog.tsx` — fix stale closure + add recalculation effect
