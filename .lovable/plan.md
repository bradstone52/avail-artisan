
# Tenants Page with Expiries Tab

## Overview
Convert the standalone Tenant Expiries page into a comprehensive "Tenants" hub with two tabs:
1. **All Tenants** - Master list of all tenants across all properties
2. **Expiries** - The existing lease expiry tracking functionality

Also fix the mobile map cutoff issue where the bottom info card is hidden behind the mobile bottom navigation.

---

## Features

### Tab 1: All Tenants
- Master table showing all tenants from `property_tenants` across all properties
- Columns: Tenant Name, Property, Unit, Size (SF), Lease Expiry, Tracked Date
- Search by tenant name or property
- Click row to navigate to property detail page
- Summary stats: Total tenants, Total SF tracked

### Tab 2: Expiries
- Existing expiry tracking content (stats cards, filters, table)
- Combines manual tenants and transaction-derived expiries
- Color-coded urgency indicators (Red: 6 months, Yellow: 6-9 months, Green: 9-12 months)

---

## Mobile Map Fix
The Properties Map bottom info card is currently hidden behind the mobile bottom navigation bar. This needs to be fixed by adding bottom padding on mobile devices.

---

## Technical Details

### New Files
| File | Purpose |
|------|---------|
| `src/pages/Tenants.tsx` | Main Tenants hub page with tabs |
| `src/hooks/useAllTenants.ts` | Fetch all tenants with property joins |
| `src/components/tenants/AllTenantsTable.tsx` | Table component for All Tenants tab |

### Modified Files
| File | Change |
|------|--------|
| `src/App.tsx` | Change route from `/tenant-expiries` to `/tenants` |
| `src/components/layout/AppLayout.tsx` | Add "Tenants" to sidebar navigation |
| `src/components/layout/MobileBottomNav.tsx` | Update link from "Tenant Expiries" to "Tenants" |
| `src/pages/PropertiesMap.tsx` | Fix bottom card positioning for mobile nav bar |
| `src/pages/TenantExpiries.tsx` | Convert to component for embedding in Tenants page |

### Page Structure
```text
/tenants
  |
  +-- Tabs
  |     |-- All Tenants (default)
  |     +-- Expiries
  |
  +-- All Tenants Tab
  |     |-- Stats Cards (Total Tenants, Total SF)
  |     |-- Search Input
  |     +-- AllTenantsTable
  |
  +-- Expiries Tab
        |-- Stats Cards (Total, Within 6 Months, Expired)
        |-- Filters (Timeframe, Source)
        +-- TenantExpiriesTable
```

### Data Model (useAllTenants)
```typescript
interface TenantWithProperty {
  id: string;
  tenantName: string;
  propertyId: string;
  propertyName: string | null;
  propertyAddress: string | null;
  propertyCity: string | null;
  unitNumber: string | null;
  sizeSf: number | null;
  leaseExpiry: string | null;
  trackedAt: string;
}
```

### Mobile Map Fix
```typescript
// PropertiesMap.tsx - Bottom Info Card
// Current: bottom-0
// Fixed: bottom-20 md:bottom-0 (accounts for 80px mobile nav)

<div className="absolute bottom-20 md:bottom-0 left-0 right-0 z-10 p-3 safe-area-bottom">
  ...
</div>

// Also update floating action button positioning
// Current: bottom-24
// Fixed: bottom-44 md:bottom-24 (moves up to stay above info card on mobile)
```

---

## Navigation Updates

### Sidebar (AppLayout.tsx)
Add "Tenants" as a top-level navigation item with the Users icon, positioned after Properties:
```typescript
const navigation = [
  { name: 'Dashboard', ... },
  { name: 'Distribution', ... },
  { name: 'Market Listings', ... },
  { name: 'Properties', ... },
  { name: 'Tenants', href: '/tenants', icon: Users },  // NEW
  { name: 'Transactions', ... },
  ...
];
```

### Mobile Bottom Nav (MobileBottomNav.tsx)
Update the "More" menu:
```typescript
const moreNav = [
  { name: 'Distribution Listings', ... },
  { name: 'Recipients', ... },
  { name: 'CRE Tracker', ... },
  { name: 'Tenants', href: '/tenants', icon: Users },  // Changed from "Tenant Expiries"
  { name: 'Settings', ... },
];
```

---

## User Experience

### Desktop/Tablet
- "Tenants" appears in the left sidebar navigation
- Click opens the Tenants page with tabs

### Mobile
- "Tenants" appears in the "More" menu
- Bottom navigation is properly cleared by the Properties Map info card
- Floating action buttons remain accessible above the info card
