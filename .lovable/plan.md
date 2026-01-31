

# Tenant Expiries Tracking Page

## Overview
Create a dedicated page to track tenant lease expiries across all properties, combining data from two sources:
1. **Manual tenants** - from the `property_tenants` table with explicit `lease_expiry` dates
2. **Transaction-derived tenants** - from `transactions` where type is "Lease", calculating expiry from `closing_date + lease_term_months`

---

## Features

### 1. Unified Expiry Dashboard
- **Combined View**: Single table showing all tenants from both sources
- **Source Indicator**: Badge showing whether data comes from "Manual" entry or "Transaction"
- **Property Context**: Each row shows tenant name, property address, unit (if applicable), size, commencement date, and expiry date
- **Status Indicators**: Color-coded badges for expiry urgency:
  - **Red (Urgent)**: Expired or within 6 months
  - **Yellow (Warning)**: 6 to 9 months
  - **Green (Upcoming)**: 9 months to 1 year
  - No indicator for expiries beyond 1 year
- **Quick Navigation**: Click to go to the property detail page

### 2. Filtering and Search
- Search by tenant name or property address
- Filter by expiry timeframe:
  - All
  - Expired
  - Within 6 months
  - Within 9 months
  - Within 1 year
- Filter by data source (Manual / Transaction / All)
- Sort by expiry date (ascending by default)

### 3. Summary Statistics
- Total tenants with expiry dates
- Number expiring within 6 months
- Number already expired

---

## Data Sources

### Manual Tenants (property_tenants)
| Field | Usage |
|-------|-------|
| `tenant_name` | Tenant Name |
| `lease_expiry` | Expiry Date |
| `unit_number` | Unit |
| `size_sf` | Size |
| `property_id` | Link to property |

### Transaction-Derived (transactions)
| Field | Usage |
|-------|-------|
| `buyer_tenant_name` | Tenant Name |
| `closing_date` | Commencement Date |
| `closing_date + lease_term_months` | Calculated Expiry Date |
| `size_sf` | Size |
| `property_id` | Link to property |

Only transactions where:
- `transaction_type = 'Lease'`
- `closing_date` is not null
- `lease_term_months` is not null

---

## Technical Details

### New Files
| File | Purpose |
|------|---------|
| `src/pages/TenantExpiries.tsx` | Main page with filters, stats, and table |
| `src/hooks/useTenantExpiries.ts` | Fetch and combine data from both sources |
| `src/components/tenants/TenantExpiriesTable.tsx` | Table component for displaying expiries |

### Modified Files
| File | Change |
|------|--------|
| `src/App.tsx` | Add route `/tenant-expiries` |
| `src/components/layout/MobileBottomNav.tsx` | Add link in "More" menu near CRE Tracker |

### Expiry Status Logic
```typescript
const getExpiryStatus = (expiryDate: string) => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const monthsUntil = differenceInMonths(expiry, today);
  
  if (monthsUntil < 0) return 'expired';      // Past due - Red
  if (monthsUntil <= 6) return 'urgent';      // Within 6 months - Red
  if (monthsUntil <= 9) return 'warning';     // 6-9 months - Yellow
  if (monthsUntil <= 12) return 'upcoming';   // 9-12 months - Green
  return 'future';                            // Beyond 1 year - No indicator
};
```

### Unified Data Model
```typescript
interface TenantExpiry {
  id: string;
  tenantName: string;
  propertyId: string | null;
  propertyName: string | null;
  propertyAddress: string | null;
  propertyCity: string | null;
  unitNumber: string | null;
  sizeSf: number | null;
  commencementDate: string | null;
  expiryDate: string;
  source: 'manual' | 'transaction';
  transactionId?: string;
}
```

### Hook Logic (useTenantExpiries)
```typescript
// 1. Fetch manual tenants with property join
const manualTenants = await supabase
  .from('property_tenants')
  .select('*, properties(name, address, city)')
  .not('lease_expiry', 'is', null);

// 2. Fetch lease transactions with term data
const leaseTransactions = await supabase
  .from('transactions')
  .select('*, properties(name, address, city)')
  .eq('transaction_type', 'Lease')
  .not('closing_date', 'is', null)
  .not('lease_term_months', 'is', null);

// 3. Transform and combine into unified format
// Calculate expiry: addMonths(closing_date, lease_term_months)
```

---

## Navigation
- Add "Tenant Expiries" link in the "More" menu on mobile (near CRE Tracker)
- Accessible via direct URL `/tenant-expiries`

