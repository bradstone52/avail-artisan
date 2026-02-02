
# City Data Address Picker Map

## Overview
Replace the current "nearby address suggestions" approach with an interactive map that shows **actual Calgary parcel addresses** near the property location. Users can visually select the correct parcel, and the system will use that official City address for the data fetch.

## Why This Works Better
The current approach uses Google reverse geocoding, which often returns addresses in a different format than Calgary's official database. By querying Calgary's Parcel Address dataset directly, we show the exact addresses that exist in the City's records - eliminating format mismatches.

## Implementation Steps

### 1. Create New Edge Function: `search-calgary-parcels`
Query Calgary's Parcel Address API using geo-spatial search:
- Accept lat/lng coordinates and search radius
- Use Socrata SODA API `within_circle()` function to find nearby parcels
- Return parcel addresses with their coordinates
- Endpoint: `https://data.calgary.ca/resource/s8b3-j88p.json`

### 2. Create New Component: `CityParcelPickerDialog`
An interactive map dialog that:
- Geocodes the property address to get starting coordinates
- Fetches nearby parcels from Calgary's database
- Displays parcels as clickable markers on a Google Map
- Shows the current property location as a distinct marker
- Allows user to click a parcel marker to select it
- On selection, updates the property address and re-triggers city data fetch

### 3. Update `CityDataNotFoundDialog`
- Add a "Search on Map" button that opens the new parcel picker
- Keep the existing "nearby suggestions" as a fallback option
- Show clearer messaging about why the address wasn't found

### 4. Update `PropertyDetail.tsx`
- Wire up the new dialog to handle parcel selection
- When user selects a parcel, update property address and refetch city data

## Technical Details

### Calgary Parcel API Query
```text
GET https://data.calgary.ca/resource/s8b3-j88p.json
  ?$where=within_circle(the_geom, {lat}, {lng}, {radius_meters})
  &$limit=50
```

### UI Flow
```text
1. User clicks "Fetch City Data"
2. Address not found in assessment database
3. Dialog appears with two options:
   - "Search on Map" -> Opens parcel picker map
   - "Suggested Addresses" -> Shows current nearby suggestions
4. User clicks parcel on map
5. System updates property address
6. System re-fetches city data with new address
```

### Map Interaction
- Current property location: Blue marker
- Calgary parcels: Orange/amber markers
- Selected parcel: Green marker with info popup
- Click parcel -> Shows address, click "Use This Address" to confirm

## Files to Create
- `supabase/functions/search-calgary-parcels/index.ts`
- `src/components/properties/CityParcelPickerDialog.tsx`

## Files to Modify
- `src/components/properties/CityDataNotFoundDialog.tsx`
- `src/pages/PropertyDetail.tsx`
