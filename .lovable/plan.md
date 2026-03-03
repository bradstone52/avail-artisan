
## Plan: "Duplicate Listing" Action in Market Listings

### What we're building
A **Copy/Duplicate** button on each market listing row that opens the Create dialog pre-populated with all the existing listing's data, so the user can tweak just the bay number (or anything else) and save as a new listing.

### How it works
1. **New `onDuplicate` prop on `MarketListingsTable`** — adds a `Copy` icon button next to the existing Edit (pencil) button in the action toolbar on each row.

2. **`MarketListingEditDialog` gets a `duplicateFrom` prop** — when provided alongside `mode='create'`, the dialog initializes all form fields from the source listing instead of blank defaults. The listing ID gets auto-generated fresh (`ML-YYYYMMDD-RAND` format, matching existing logic), and `status` resets to `'Active'`.

3. **`MarketListings.tsx` wires it up** — adds a `duplicatingListing` state, passes `onDuplicate` to the table, and passes `duplicateFrom={duplicatingListing}` to the existing Create dialog.

### Changes
- **`src/components/market/MarketListingsTable.tsx`**: Add `onDuplicate` prop, import `Copy` icon, add Copy button in the action row next to Edit.
- **`src/components/market/MarketListingEditDialog.tsx`**: Add `duplicateFrom?: MarketListing` prop; in the `useEffect` that initializes form state, detect when `duplicateFrom` is set and pre-fill all fields from it (generating a new listing ID).
- **`src/pages/MarketListings.tsx`**: Add `duplicatingListing` state, pass `onDuplicate={setDuplicatingListing}` to the table, and open the create dialog with `duplicateFrom` when that state is set.

### User experience
- User clicks the **Copy** icon on any listing row
- The "Add Listing" dialog opens, pre-filled with all the copied listing's specs
- User changes what they need (e.g. address from "123 Main St Bay 1" → "123 Main St Bay 2")
- Saves — creates a brand new listing with a fresh ID
