

## Plan: Update Matching Listings Logic and UI

### Overview
This plan updates the prospect matching listings feature with new size-based matching rules, adds yard filtering, removes the follow-up date display, and improves the "view more" functionality.

---

### Changes Summary

#### 1. Update Size Matching Logic
The new matching algorithm will use the prospect's `max_size` (Required Size) to determine a size range:

| Required Size | Match Range |
|---------------|-------------|
| 8,000 - 12,999 | 8,000 - 13,000 SF |
| 13,000 - 19,999 | 13,000 - (required size + 5,000) SF |
| 20,000+ | 20,000 - (required size + 10,000) SF |

#### 2. Add Yard Required Filtering
- If prospect has `yard_required: true`, only match listings where the `yard` field indicates a yard is available (not "Unknown", "No", or empty)
- If prospect does not require yard, include all listings regardless of yard status

#### 3. Remove Follow-up Date Display
- Remove the Follow-up Date row from `ProspectViewCard.tsx`
- Remove the `FollowUpDatesSection` component from the detail page layout
- Keep the component file in case it's needed later for other purposes

#### 4. Update "View All Matching Listings" Link
- Replace the text "+X more listings" with a clickable "View all matching listings" button
- Clicking will expand to show all matching listings in the card

---

### Technical Details

**File: `src/components/prospects/MatchingListingsSection.tsx`**
- Rewrite the filtering logic with the new size ranges
- Add yard matching logic (check if `listing.yard` is truthy and not "Unknown" or "No")
- Add state to track expanded/collapsed view
- Replace the "+X more" text with a clickable button that shows all listings

**File: `src/components/prospects/ProspectViewCard.tsx`**
- Remove the Follow-up Date display row (lines 88-91)

**File: `src/pages/ProspectDetail.tsx`**
- Remove the `FollowUpDatesSection` import and usage from the layout

---

### New Matching Logic (Pseudocode)

```text
function getMatchingListings(prospect, listings):
  requiredSize = prospect.max_size
  yardRequired = prospect.yard_required
  
  for each listing in listings:
    // Status check
    if listing.status != 'Active': skip
    
    // Size range calculation
    if requiredSize >= 8000 AND requiredSize < 13000:
      minSize = 8000
      maxSize = 13000
    else if requiredSize >= 13000 AND requiredSize < 20000:
      minSize = 13000
      maxSize = requiredSize + 5000
    else if requiredSize >= 20000:
      minSize = 20000
      maxSize = requiredSize + 10000
    else:
      // Below 8000 or not set - no matches
      skip
    
    // Size filter
    if listing.size_sf < minSize OR listing.size_sf > maxSize: skip
    
    // Yard filter
    if yardRequired:
      if listing.yard is empty, "Unknown", or "No": skip
    
    // Match!
    add to matches
```

---

### Files to Modify

| File | Change |
|------|--------|
| `src/components/prospects/MatchingListingsSection.tsx` | Update matching logic, add expand/collapse for listings |
| `src/components/prospects/ProspectViewCard.tsx` | Remove Follow-up Date row |
| `src/pages/ProspectDetail.tsx` | Remove FollowUpDatesSection |

