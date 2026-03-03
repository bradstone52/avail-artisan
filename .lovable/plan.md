
## Plan: Bulk Edit Common Fields for Market Listings

The user wants to select multiple listings and edit shared/common data fields across all of them at once.

### What to build

**1. Row checkboxes in `MarketListingsTable.tsx`**
- Add new props: `selectedIds: Set<string>`, `onToggleSelect: (id: string) => void`, `onToggleSelectAll: (ids: string[]) => void`
- Add a checkbox column as the first `<TableHead>` / `<TableCell>` in each row
- Header checkbox = select/deselect all visible rows

**2. Selection state in `MarketListings.tsx`**
- Add `selectedIds: Set<string>` state
- Pass down to `MarketListingsTable`
- Clear selection when filters change

**3. Floating selection toolbar in `MarketListings.tsx`**
- Appears above the table when `selectedIds.size > 0`
- Shows "X listings selected", a "Bulk Edit" button, and a "Clear" button

**4. New `BulkEditListingsDialog.tsx`**
- Fields the user can optionally overwrite across all selected listings:
  - **Submarket** (select from existing values)
  - **City** (text input)
  - **Status** (select)
  - **Listing Type** (select)
  - **Landlord** (text)
  - **Broker Source** (text)
  - **Is Distribution Warehouse** (checkbox)
- Every field is optional — only fields the user explicitly fills in get written
- On confirm: single `supabase.from('market_listings').update({...nonBlankFields}).in('id', [...selectedIds])`
- If address or city was changed, trigger geocode per listing (city only in this case — address field is not included to avoid mass-geocoding; address edits are still done one at a time)
- Show success toast with count

### Files to create/edit
- **Edit** `src/components/market/MarketListingsTable.tsx` — add checkbox column + new props
- **Edit** `src/pages/MarketListings.tsx` — add selection state, toolbar, open bulk edit dialog
- **Create** `src/components/market/BulkEditListingsDialog.tsx` — bulk edit dialog
