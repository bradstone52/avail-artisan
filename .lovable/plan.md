

# Fix Deal Sheet PDF Generation Issues

## Problems Identified

1. **Infinite Render Loop**: The `GenerateDealSheetDialog` has useEffect hooks that cause infinite re-renders because the dependency arrays contain objects that change reference on every render.

2. **PDF Not Updating**: The new PDF format is in the code but may not be used due to the render loop crashing the component or Vite's caching.

---

## Root Cause Analysis

### Infinite Loop (lines 104-122 in GenerateDealSheetDialog.tsx)

The `existingConditions` and `existingDeposits` arrays are returned from hooks that create new array references on each render. When the useEffect runs, it calls `setLocalConditions()` which triggers a re-render, creating a new array reference, triggering the effect again.

```typescript
// PROBLEM: This creates infinite loop
useEffect(() => {
  if (existingConditions) {
    setLocalConditions(existingConditions.map(c => ({...})));
  }
}, [existingConditions]); // New reference every render!
```

---

## Solution

### Fix 1: Update useEffect Dependencies

Use a stable comparison for the dependency array. Compare the JSON string of the conditions/deposits to prevent unnecessary updates:

```typescript
// Use a ref to track if initial data has been loaded
const conditionsLoaded = useRef(false);
const depositsLoaded = useRef(false);

useEffect(() => {
  // Only set local conditions once when existingConditions first loads
  if (existingConditions && existingConditions.length > 0 && !conditionsLoaded.current) {
    conditionsLoaded.current = true;
    setLocalConditions(existingConditions.map(c => ({
      id: c.id,
      description: c.description,
      due_date: c.due_date,
    })));
  }
}, [existingConditions]);

useEffect(() => {
  if (existingDeposits && existingDeposits.length > 0 && !depositsLoaded.current) {
    depositsLoaded.current = true;
    setLocalDeposits(existingDeposits.map(d => ({
      id: d.id,
      amount: d.amount,
      held_by: d.held_by || '',
    })));
  }
}, [existingDeposits]);
```

### Alternative Fix (Better approach):

Use a stable ID-based comparison:

```typescript
// Create stable dependency based on IDs
const conditionIds = existingConditions?.map(c => c.id).join(',') || '';
const depositIds = existingDeposits?.map(d => d.id).join(',') || '';

useEffect(() => {
  if (existingConditions) {
    setLocalConditions(existingConditions.map(c => ({
      id: c.id,
      description: c.description,
      due_date: c.due_date,
    })));
  }
}, [conditionIds]); // Stable string comparison

useEffect(() => {
  if (existingDeposits) {
    setLocalDeposits(existingDeposits.map(d => ({
      id: d.id,
      amount: d.amount,
      held_by: d.held_by || '',
    })));
  }
}, [depositIds]); // Stable string comparison
```

### Fix 2: Reset refs when dialog closes/reopens

Reset the tracking refs when the dialog state changes so data reloads properly on each open:

```typescript
useEffect(() => {
  if (open) {
    conditionsLoaded.current = false;
    depositsLoaded.current = false;
  }
}, [open]);
```

---

## Files to Modify

1. **`src/components/deals/GenerateDealSheetDialog.tsx`**
   - Add `useRef` import
   - Create `conditionsLoaded` and `depositsLoaded` refs
   - Update the two useEffect hooks to use stable dependencies
   - Add reset effect when dialog opens/closes

---

## Summary

| Issue | Location | Fix |
|-------|----------|-----|
| Infinite render loop | Lines 104-122 | Use stable ID-based dependencies or refs to track initial load |
| PDF uses old format | N/A | Fixing the render loop will allow the component to work and use the updated DealSheetPDF |

