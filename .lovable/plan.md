

# Enhanced City Parcel Picker

## Problem
- Parcel polygon/boundary data is proprietary (Calgary sells it for $290+/section)
- My Property map cannot be embedded (blocked by X-Frame-Options)
- Current picker shows small pin markers that aren't visually distinctive

## Solution: Hybrid Approach

### 1. Widen Search Radius
Increase from 200m to **500m** to capture more nearby parcels.

### 2. Switch to Satellite View
Use Google Maps `mapTypeId: 'hybrid'` to show satellite imagery with labels. Users can see actual building footprints and lot boundaries from aerial photos.

### 3. Improved Labeled Markers
Replace generic pin markers with **custom HTML labels** showing:
- Street number prominently displayed
- Background color for visibility
- Larger touch targets

### 4. Add "Open in My Property" Button
Direct link to Calgary's official map centered on coordinates:
```
https://maps.calgary.ca/myproperty/?find={lat},{lng}
```
User can view official blue parcel boundaries in a new tab, then return to select the correct address.

### 5. Semi-Transparent Parcel Circles
Draw approximate lot areas around each parcel point using Google Maps circles (~30m radius) to give spatial context.

## Files to Modify

**`supabase/functions/search-calgary-parcels/index.ts`**
- Update default radius parameter to 500m

**`src/components/properties/CityParcelPickerDialog.tsx`**
- Enable `mapTypeId: 'hybrid'` for satellite view
- Replace PinElement markers with custom HTML label markers
- Add circle overlays around parcel points
- Add "Open in My Property" external link button

## UI Flow
```text
1. Dialog opens with satellite view
2. Labeled markers show each parcel's street number
3. User can click "Open in My Property" to view official boundaries
4. User returns and clicks correct address marker
5. Selection confirmed and property updated
```

## Technical Implementation

### Satellite Map Config
```typescript
const map = new google.maps.Map(mapRef.current!, {
  center,
  zoom: 18,
  mapTypeId: 'hybrid',  // Satellite + labels
  mapId: 'parcel-picker-map',
});
```

### Custom Labeled Markers
```typescript
const labelDiv = document.createElement('div');
labelDiv.innerHTML = `
  <div style="
    background: #f59e0b; 
    color: white;
    padding: 6px 10px;
    border-radius: 6px;
    font-weight: bold;
    font-size: 14px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    border: 2px solid white;
  ">
    ${streetNumber}
  </div>
`;
```

### My Property Link
```typescript
const myPropertyUrl = `https://maps.calgary.ca/myproperty/?find=${lat},${lng}`;
window.open(myPropertyUrl, '_blank');
```

