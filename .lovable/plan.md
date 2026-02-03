
# Market Listings Form Reorganization

## Overview

Reorganize the MarketListingEditDialog form into a tabbed interface with three sections:
- **Property Info** - Location and classification fields
- **Building Specs** - Physical building characteristics
- **Pricing & Details** - Financials, contacts, and notes

## Changes Summary

### 1. Hide Listing ID Field
- Remove the visible Listing ID input from the form
- Keep the auto-generation logic for create mode (runs behind the scenes)

### 2. Add Tabs Component
Import and use the existing `Tabs` component from `@/components/ui/tabs`

### 3. Tab Structure

**Tab 1: Property Info**
Fields in order:
- Address (street address field)
- Building/Unit (new field for suite/unit number - will display combined in display_address)
- City (dropdown using CityCombobox)
- Submarket (auto-assigned for Calgary, manual for others - read-only display)
- Status (dropdown)
- Listing Type (dropdown: Lease, Sale, Sublease, Sale/Lease)
- Zoning (text input)

**Tab 2: Building Specs**
Fields organized in 2-column grid:
- Land Acres
- Size (SF)
- Warehouse SF
- Office SF
- Ceiling Height (clear_height_ft)
- Dock Doors
- Drive-In Doors
- Building Depth (new field - already in DB)
- Power Amps
- Power Voltage
- Sprinklers
- Cranes
- Crane Tons
- Yard (toggle)
- Yard Area
- Cross-Dock (toggle)
- Trailer Parking
- MUA (toggle)
- Dist. Warehouse (toggle)

**Tab 3: Pricing & Details**
Fields in order:
- Asking Rate (PSF)
- Op Costs
- Sale Price
- Sublease Expiry
- Availability
- Brokerage (dropdown using BrokerageCombobox)
- Landlord (dropdown using LandlordCombobox)
- Brochure Link
- Public Notes (textarea)
- Internal Notes (textarea)

## Technical Details

### File to Modify
`src/components/market/MarketListingEditDialog.tsx`

### New State Variables
- `buildingUnit` - for the new building/unit field
- `buildingDepth` - to support the existing DB field

### Address Handling
The address field will be split into:
1. **Address** - Street address (e.g., "123 Industrial Way")
2. **Building/Unit** - Suite or unit number (e.g., "Unit 4" or "Bay 200")

The `display_address` will be auto-generated as `{address} — {buildingUnit}` unless manually edited.

### Form Persistence
Update the `getFormState` and `applyFormState` functions to include new fields while maintaining the existing localStorage draft persistence pattern.

### Styling
- Use existing neo-brutalist tab styling from `@/components/ui/tabs`
- Maintain the existing `input-filled` class pattern for populated fields
- Keep the neo-brutalist toggle buttons for boolean fields (Yard, Cross-Dock, MUA, Dist. Warehouse)

## Implementation Steps

1. Add import for `Tabs, TabsContent, TabsList, TabsTrigger`
2. Add new state variables for `buildingUnit` and `buildingDepth`
3. Update `getFormState()` and `applyFormState()` to include new fields
4. Update initialization logic to parse building/unit from existing listings if present
5. Replace the flat form layout with tabbed structure
6. Remove the Listing ID field from visible form
7. Reorganize fields into the three tabs per the specification
8. Update save handlers to include `building_depth` and combine address with unit

## Database
No schema changes required - `building_depth` already exists in the `market_listings` table.
