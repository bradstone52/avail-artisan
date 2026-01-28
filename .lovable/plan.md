

# Fix Deal Sheet PDF Rendering Issues

## Problem Analysis
The `DealSheetPDF.tsx` file has been updated with the new design (blue headers, yellow party sections, green commission, pink comments), but there are rendering bugs preventing the PDF from generating correctly:

1. **Empty Text Component Warning** - Lines 432-435 and 475-477 contain empty `<Text>` components that cause react-pdf warnings
2. **Unsupported CSS Property** - Lines 362 and 366 use `gap: 4` which is not fully supported in react-pdf
3. **Buffer Not Defined** - A known react-pdf browser compatibility issue

---

## Fixes Required

### File: `src/components/documents/DealSheetPDF.tsx`

#### Fix 1: Replace `gap` with `marginRight` in header (Lines 362-369)

**Current:**
```tsx
<View style={{ flexDirection: 'row', gap: 4 }}>
  <Text style={styles.dealInfo}>Deal #:</Text>
  <Text style={styles.dealInfoBold}>{deal.deal_number || '_________'}</Text>
</View>
<View style={{ flexDirection: 'row', gap: 4 }}>
  <Text style={styles.dealInfo}>Date:</Text>
  <Text style={styles.dealInfoBold}>{format(new Date(), 'MMMM d, yyyy')}</Text>
</View>
```

**Fixed:**
```tsx
<View style={{ flexDirection: 'row' }}>
  <Text style={[styles.dealInfo, { marginRight: 4 }]}>Deal #:</Text>
  <Text style={styles.dealInfoBold}>{deal.deal_number || '_________'}</Text>
</View>
<View style={{ flexDirection: 'row' }}>
  <Text style={[styles.dealInfo, { marginRight: 4 }]}>Date:</Text>
  <Text style={styles.dealInfoBold}>{format(new Date(), 'MMMM d, yyyy')}</Text>
</View>
```

#### Fix 2: Remove empty Text elements (Lines 430-435 and 473-478)

**Current:**
```tsx
{sellerBrokerage?.address && (
  <View style={styles.partyRow}>
    <Text style={styles.partyLabel}></Text>
    <Text style={styles.partyValue}>{sellerBrokerage.address}</Text>
  </View>
)}
```

**Fixed:**
```tsx
{sellerBrokerage?.address && (
  <View style={styles.partyRow}>
    <Text style={styles.partyLabel}>{' '}</Text>
    <Text style={styles.partyValue}>{sellerBrokerage.address}</Text>
  </View>
)}
```

Same fix needed for buyer brokerage address section (lines 473-478).

#### Fix 3: Add Buffer polyfill (vite.config.ts)

To fix the "Buffer is not defined" error, need to add a polyfill configuration:

**File: `vite.config.ts`**

Add define option to provide Buffer polyfill for browser environments.

---

## Summary of Changes

| File | Issue | Fix |
|------|-------|-----|
| `DealSheetPDF.tsx` | `gap` property unsupported | Replace with `marginRight: 4` |
| `DealSheetPDF.tsx` | Empty Text components | Replace empty strings with `{' '}` |
| `vite.config.ts` | Buffer not defined | Add global Buffer definition |

---

## Files to Modify

1. `src/components/documents/DealSheetPDF.tsx` - Fix gap and empty text issues
2. `vite.config.ts` - Add Buffer polyfill for react-pdf compatibility

