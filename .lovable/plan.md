

# Known Tenants Feature with Live Map

## Overview
Add a tenant tracking system to the Properties section with a live map interface optimized for iPad field use. Users can see their current location, view nearby properties as pins, tap to add tenants to existing properties, or tap the map to create new properties and log tenants.

---

## Database Changes

### New Table: `property_tenants`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| property_id | uuid (FK) | Reference to properties table |
| tenant_name | text | Name of the tenant/company |
| unit_number | text | Optional unit identifier |
| size_sf | integer | Space occupied (null if unknown) |
| notes | text | Additional notes |
| tracked_at | timestamp | When the tenant was logged |
| tracked_by | uuid | User who logged the tenant |
| created_at | timestamp | Record creation time |

RLS policies will ensure users can only manage tenants for properties in their organization.

---

## Feature Components

### 1. Live Map Page (`/properties/map`)
A dedicated full-screen map page optimized for iPad field use:
- **User Location Tracking**: Blue pulsing dot showing current GPS position
- **Property Pins**: Existing properties displayed as markers (different color for properties with/without tenants)
- **One-Mile Radius View**: Default zoom level showing ~1 mile around user
- **Click-to-Add**: Tap anywhere on the map to add a new property at that location
- **Quick Actions**: Tap existing property pins to view/add tenants

### 2. Tenants Tab on Property Detail
- New "Tenants" tab on PropertyDetail page
- Display list of known tenants with name, unit, size, and tracking date
- Add/Edit/Delete functionality via dialog
- Quick stats showing tenant count and occupied space

### 3. Add Tenant Dialog
Fields:
- Tenant name (required)
- Unit number (optional)
- Size SF (optional, with formatted number input)
- Notes (optional)

Auto-populated:
- `tracked_at` timestamp
- `tracked_by` user ID

### 4. New Property from Map Location
When user taps an empty area on the map:
1. Reverse geocode the tapped coordinates using Google Geocoding API
2. Open PropertyEditDialog with pre-filled address (editable by user if geocoding is incorrect)
3. After property creation, immediately open Add Tenant dialog

---

## User Experience Flows

### Flow 1: Track Tenant at Existing Property
```text
User opens /properties/map
        |
        v
Map shows user location + nearby properties
        |
        v
User taps property pin
        |
        v
Popup shows property info + "Add Tenant" button
        |
        v
Add Tenant dialog opens
        |
        v
User enters tenant info and saves
        |
        v
Toast: "Tenant added to [Property Name]"
```

### Flow 2: Add New Property + Tenant
```text
User taps empty area on map
        |
        v
Loading spinner while reverse geocoding
        |
        v
Property dialog opens with pre-filled address
(User can edit address if geocoding is wrong)
        |
        v
User adjusts/confirms details and saves
        |
        v
Property created, Add Tenant dialog opens
        |
        v
User enters tenant info and saves
```

### Flow 3: View Property from Map
```text
User taps property pin
        |
        v
Popup shows: Property name, address, tenant count
        |
        v
User can tap "View Details" to go to PropertyDetail
or "Add Tenant" to quickly add a tenant
```

---

## Technical Implementation

### Files to Create
| File | Purpose |
|------|---------|
| `src/pages/PropertiesMap.tsx` | Live map page with location tracking |
| `src/components/properties/TenantsSection.tsx` | Tenant list for PropertyDetail |
| `src/components/properties/AddTenantDialog.tsx` | Add/Edit tenant dialog |
| `src/hooks/usePropertyTenants.ts` | CRUD operations for tenants |
| `src/hooks/useGeolocation.ts` | GPS location access hook |

### Files to Modify
| File | Changes |
|------|---------|
| `src/pages/PropertyDetail.tsx` | Add Tenants tab |
| `src/pages/Properties.tsx` | Add "Open Map" button in header |
| `src/App.tsx` | Add route for `/properties/map` |

### Map Implementation Details
- Reuse Google Maps setup from `DistributionMapView`
- Use `navigator.geolocation.watchPosition()` for continuous location updates
- Different marker colors: Blue (properties), Yellow (selected), Green (has tenants)
- User location shown as pulsing blue dot
- Info windows on property markers with quick actions
- Click handler on map for creating new properties

### Reverse Geocoding for New Properties
When user taps the map:
1. Get tapped coordinates from click event
2. Call Google Geocoding API with `latlng` parameter
3. Extract formatted address components
4. Pre-fill PropertyEditDialog form
5. User can manually edit the address if the system populated incorrectly
6. On save, store coordinates from the original tap location

### Mobile/iPad Considerations
- Large touch targets (minimum 44px)
- Full-screen map with minimal UI chrome
- Bottom sheet for property info (easier thumb reach)
- Clear GPS acquisition feedback (spinner + status text)
- Handle location permission denial gracefully
- Support both high and low GPS accuracy modes

---

## Security
- RLS policies on `property_tenants` table matching existing property access patterns
- Tenant data scoped to organization via property ownership
- GPS data only used for display and matching, never stored on server
- Geocoding requests go through existing `get-google-maps-token` edge function

---

## Navigation
- Add "Map View" button to Properties page header
- Add link in main navigation under Properties section
- Deep link support: `/properties/map?lat=XX&lng=YY` to open at specific location

