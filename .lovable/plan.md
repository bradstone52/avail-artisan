
# Batch City Data Sync - Handle Unmatched Properties

## Problem Statement
When running "Fetch All City Data", properties that don't find a match in the City of Calgary database are processed silently with no indication of failure. Users aren't informed which properties need manual address correction using the City Parcel Picker.

## Proposed Solution
Track unmatched properties during batch sync and surface them to users so they can take corrective action.

## Implementation Steps

### 1. Modify `fetch-city-data` Edge Function Response
Update the response to clearly indicate when no assessment match was found:
- Continue returning HTTP 200 (it's not an error, just "no match")
- Add explicit `matchStatus: 'found' | 'not_found'` to the response
- Include the address in the response for tracking purposes

### 2. Update `nightly-property-sync` Batch Processing
Track unmatched properties during batch processing:
- Maintain a list of property IDs/addresses that returned `assessmentFound: false`
- Store the unmatched count and list in the progress tracking object
- Include this data in the final "complete" status

Progress object enhancement:
```text
{
  syncId: "...",
  current: 50,
  total: 100,
  status: "running",
  matched: 45,        // NEW: Properties with city data found
  unmatched: 5,       // NEW: Properties without matches
  unmatchedIds: [...]  // NEW: List of property IDs needing attention
}
```

### 3. Update Properties Page UI
When sync completes, show a summary that distinguishes matched vs. unmatched:
- Success toast: "City data sync complete: 45 of 50 properties updated"
- If unmatched > 0, show additional notification with option to review

### 4. Add "Review Unmatched Properties" Feature
Provide a way to see and fix properties that didn't match:
- Option A: Filter properties list to show only those needing attention (where `city_data_fetched_at` is set but `roll_number` is NULL)
- Option B: Add a "Needs Review" badge/indicator on property rows
- Either approach lets users click through to use the City Parcel Picker

## Technical Details

### Edge Function Changes

**`fetch-city-data/index.ts`** - Line ~463:
```typescript
return new Response(JSON.stringify({ 
  success: true,
  assessmentFound: !!assessmentData,
  permitsFound: assessmentData ? permits.length : 0,
  matchStatus: assessmentData ? 'found' : 'not_found',  // NEW
  propertyId,  // NEW - for tracking
  address      // NEW - for display
}), { ... });
```

**`nightly-property-sync/index.ts`** - processBatch function:
- Parse the response JSON to check `assessmentFound`
- Maintain arrays for `matchedIds` and `unmatchedAddresses`
- Include these in progress updates and final completion status

### Frontend Changes

**`src/pages/Properties.tsx`**:
- Update progress polling to read new fields
- Modify completion toast to show "X of Y found matches"
- If unmatched > 0, offer link/button to filter to those properties

### Database Query for Unmatched Properties
Properties needing attention can be identified with:
```sql
SELECT * FROM properties 
WHERE city ILIKE '%calgary%' 
  AND city_data_fetched_at IS NOT NULL 
  AND roll_number IS NULL
```

## Benefits
- Users will know immediately if some properties need manual intervention
- Easy to find and fix problem properties
- No changes needed to the parcel picker itself - it already works well
- Transparent sync results instead of silent "failures"
