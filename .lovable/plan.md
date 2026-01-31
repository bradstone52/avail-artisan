
# Duplicate Address Prevention with Confirmation Warning

## Overview
When a user ignores address suggestions and submits a transaction with an address that already exists in the database, the system will show a warning confirmation dialog. This gives users a chance to reconsider while still allowing legitimate duplicates (e.g., different units at the same address).

## User Flow
1. User types an address, ignores suggestions (or no suggestions appear)
2. User clicks "Create Transaction"
3. System checks for existing records with similar addresses
4. If match found: **Warning dialog appears** showing the existing property details
5. User can choose:
   - **"Use Existing"** - Auto-fill from the matched property
   - **"Create Anyway"** - Proceed with the new entry (for legitimate cases)
   - **"Cancel"** - Return to form to edit

## Warning Dialog Design
```text
+-------------------------------------------+
|  ⚠️ Similar Property Found                |
+-------------------------------------------+
|  An existing property matches this        |
|  address:                                 |
|                                           |
|  📍 123 Main Street NW                    |
|     Calgary | 50,000 SF                   |
|                                           |
|  Do you want to link this transaction     |
|  to the existing property, or create      |
|  a new entry?                             |
+-------------------------------------------+
| [Cancel] [Create Anyway] [Use Existing]   |
+-------------------------------------------+
```

## Technical Implementation

### 1. Create Duplicate Check Hook
**New file:** `src/hooks/useDuplicateAddressCheck.ts`

- Function to search properties, market_listings, and transactions tables
- Normalize addresses for comparison (lowercase, trim whitespace)
- Return matching records if found

### 2. Create Warning Dialog Component
**New file:** `src/components/transactions/DuplicateAddressWarning.tsx`

- Uses existing `AlertDialog` pattern from `ConfirmDialog`
- Displays matched property details (address, city, size)
- Three action buttons: Cancel, Create Anyway, Use Existing

### 3. Update TransactionForm Submit Logic
**File:** `src/pages/TransactionForm.tsx`

- Before saving, call duplicate check
- If match found, show warning dialog instead of saving immediately
- Handle user's choice (proceed, cancel, or use existing)

### 4. Integrate with AddressCombobox (from previous plan)
The combobox will still show suggestions as user types, but this provides a **second layer of protection** at submit time for users who ignore or miss the suggestions.

## Files to Create/Modify
1. **Create:** `src/hooks/useDuplicateAddressCheck.ts` - Address matching logic
2. **Create:** `src/components/transactions/DuplicateAddressWarning.tsx` - Warning dialog
3. **Modify:** `src/pages/TransactionForm.tsx` - Add pre-submit validation

## Edge Cases
- **Exact match vs fuzzy match**: Use normalized string comparison (lowercase, trimmed)
- **Same address, different unit**: User clicks "Create Anyway" for legitimate duplicates
- **Edit mode**: Skip duplicate check when editing existing transaction (or exclude current record from check)
- **Case sensitivity**: "123 MAIN ST" matches "123 Main St"
