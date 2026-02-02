
# Implement Dedicated City Lookup Address Field

## Overview
Add a `city_lookup_address` field to properties that is used exclusively for City of Calgary API lookups, while the main `address` field remains for market listing auto-linking.

## Current State of #54 5381 72 Avenue SE
The property currently has addresses swapped due to the previous workaround:
- **address**: `5353 72 AV SE` (City canonical format)
- **display_address**: `#54 5381 72 Avenue SE` (Market listing format)

After this implementation, it will be:
- **address**: `#54 5381 72 Avenue SE` (matches market listing)
- **display_address**: `null` (not needed)
- **city_lookup_address**: `5353 72 AV SE` (for City API)

## Implementation Steps

### Step 1: Database Migration
Add the new column to the properties table:
```sql
ALTER TABLE properties ADD COLUMN city_lookup_address text;
```

### Step 2: Fix #54 5381 72 Avenue SE Data
Update the specific property to use the new field correctly:
```sql
UPDATE properties 
SET 
  city_lookup_address = '5353 72 AV SE',
  address = '#54 5381 72 Avenue SE',
  display_address = null
WHERE id = '513360ca-bdf4-4e83-8a8e-fa2feff8e819';
```

### Step 3: Update Edge Function
Modify `fetch-city-data` to check for `city_lookup_address` first:

```text
Current Flow:
1. Receive propertyId + address from client
2. Query City API using address

New Flow:
1. Receive propertyId + address from client
2. Fetch property to get city_lookup_address
3. Query City API using city_lookup_address (if set) or address (fallback)
```

### Step 4: Update Property Edit Dialog
Add "City Lookup Address" field in the Details tab, after Display Address:
- Label: "City Lookup Address"
- Placeholder: "Override for City of Calgary lookups"
- Help text: "Optional. Use if the city database uses a different address format"

Location in form (after line 377 in PropertyEditDialog.tsx):
```text
Address *         [#54 5381 72 Avenue SE    ]
Display Address   [                          ]  <- Optional cosmetic override
City Lookup Addr  [5353 72 AV SE             ]  <- NEW: For City API only
```

## Files to Modify

| File | Change |
|------|--------|
| Database | Add `city_lookup_address` column |
| `supabase/functions/fetch-city-data/index.ts` | Fetch property record, use `city_lookup_address` if set |
| `src/components/properties/PropertyEditDialog.tsx` | Add City Lookup Address input field |
| `src/hooks/useProperties.ts` | Add `city_lookup_address` to save/update operations |

## Result
After implementation:
- The market listing link for #54 5381 72 Avenue SE will be restored via address match
- City of Calgary tax data will continue to fetch correctly using the dedicated lookup address
- Future properties with address discrepancies can use the new field without breaking links
