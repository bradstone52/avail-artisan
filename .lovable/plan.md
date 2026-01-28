
# Fix Deal Sheet PDF Issues

## Problems Identified

1. **Green background not filling Financial/Trust section**: The right column (Financial/Trust Details) doesn't have green background extending to match the height of the Commission Breakdown section
2. **Comments section getting cut off**: Comments should flow to a second page if there's no space, rather than being cut off
3. **Title showing "sale/lease"**: The dynamic title logic is in place but may not be rendering correctly

---

## Fixes Required

### File: `src/components/documents/DealSheetPDF.tsx`

#### Fix 1: Green Background Full Height (Lines 201-227)

The issue is that while `greenBody` has `flex: 1`, the parent `financialSection` View doesn't have proper flex styling to stretch to match the sibling column. Need to add `display: 'flex'` and ensure both columns stretch equally.

**Update styles:**
- Add `display: 'flex'` and `flexDirection: 'column'` to `commissionSection` and `financialSection`
- Ensure `greenBody` fills remaining space with `flexGrow: 1`

**Current `financialSection` style (line 211-216):**
```tsx
financialSection: {
  flex: 1,
  borderWidth: 1,
  borderColor: BLACK,
  marginLeft: 5,
},
```

**Updated:**
```tsx
financialSection: {
  flex: 1,
  borderWidth: 1,
  borderColor: BLACK,
  marginLeft: 5,
  display: 'flex',
  flexDirection: 'column',
},
```

Same update needed for `commissionSection`.

Also update `greenBody` to:
```tsx
greenBody: {
  backgroundColor: GREEN_BG,
  padding: 8,
  flexGrow: 1,
},
```

#### Fix 2: Comments Section on Second Page (Lines 629-635)

Move the Comments section outside the main `<Page>` and create it as a second page that can accommodate the content without being cut off. Or use `wrap={false}` to prevent partial rendering.

**Solution**: Wrap the comments section in its own `<View wrap={false}>` which will push it to the next page if it doesn't fit, OR explicitly put comments on a separate page.

Better approach: Use `break="before"` on the comments section to ensure it always starts on a fresh page OR use `wrap` property to prevent breaking within comments.

**Updated Comments section:**
```tsx
{/* Comments - on second page if needed */}
<View wrap={false}>
  <View style={styles.commentsHeader}>
    <Text style={styles.sectionTitle}>Comments</Text>
  </View>
  <View style={styles.commentsBody}>
    <Text style={styles.commentsText}>{deal.notes || '—'}</Text>
  </View>
</View>
```

This ensures the comments header + body stay together and if they don't fit on page 1, they'll flow to page 2.

#### Fix 3: Title Not Updating

The code at line 363 appears correct:
```tsx
<Text style={styles.mainTitle}>{deal.deal_type === 'Lease' ? 'lease' : 'sale'} dealsheet</Text>
```

However, possible issues:
1. The deal might have a `deal_type` value that's not exactly "Lease" (e.g., lowercase or different value)
2. Need to ensure the comparison handles case-insensitivity

**Updated logic:**
```tsx
<Text style={styles.mainTitle}>
  {deal.deal_type?.toLowerCase() === 'lease' ? 'lease' : 'sale'} dealsheet
</Text>
```

This makes the check case-insensitive and handles undefined gracefully.

---

## Summary of Changes

| Location | Issue | Fix |
|----------|-------|-----|
| Styles (lines 205-227) | Green BG not filling | Add `display: 'flex'`, `flexDirection: 'column'` to sections, change `flex: 1` to `flexGrow: 1` in `greenBody` |
| Lines 629-635 | Comments cut off | Wrap in `<View wrap={false}>` to keep header+body together |
| Line 363 | Title not dynamic | Use case-insensitive comparison: `deal.deal_type?.toLowerCase() === 'lease'` |

---

## Files to Modify

1. `src/components/documents/DealSheetPDF.tsx`
   - Update `commissionSection` and `financialSection` styles to use flex column layout
   - Update `greenBody` to use `flexGrow: 1`
   - Wrap comments section with `wrap={false}`
   - Make title comparison case-insensitive
