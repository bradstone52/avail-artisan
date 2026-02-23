

## Auto-Create Transaction When Deal Closes (Deal Preserved)

Deals are never deleted -- they remain in the database permanently for historical tracking and reporting. When a deal's status changes to "Closed", the system will additionally create a Transaction record as a parallel entry in the Transactions hub.

### What Happens When a Deal is Set to "Closed"

1. Deal record is updated in place (preserved forever)
2. A Transaction record is auto-created with mapped fields from the deal
3. For lease-type deals (Lease, Sublease, Renewal), a Tenant record is also auto-created (already implemented)

### Data Mapping: Deal to Transaction

| Deal Field | Transaction Field |
|---|---|
| `deal_type` | `transaction_type` |
| `address` | `address` |
| `city` | `city` |
| `submarket` | `submarket` |
| `size_sf` | `size_sf` |
| `close_date` | `transaction_date` |
| `closing_date` | `closing_date` |
| `deal_value` | `sale_price` (Sale deals only) |
| `lease_rate_psf` | `lease_rate_psf` |
| `lease_term_months` | `lease_term_months` |
| `buyer_name` | `buyer_tenant_name` |
| `seller_name` | `seller_landlord_name` |
| `commission_percent` | `commission_percent` |
| `notes` | `notes` |
| `property_id` | `property_id` |
| `org_id` | `org_id` |

### Technical Changes

**1. Database migration -- Broaden `property_tenants` INSERT RLS policy**

The current policy only allows the property creator to add tenants. Update it so any org member can insert tenants for properties within their org. This fixes the silent failure identified earlier.

**2. `src/hooks/useDeals.ts` -- Add transaction creation in `useUpdateDeal` onSuccess**

- After the existing tenant-creation block, add transaction-creation logic
- Applies to ALL deal types (Sale, Lease, Sublease, Renewal) when status becomes "Closed"
- Duplicate check: query `transactions` for an existing record with matching `address` + `org_id` + `property_id`
- Map deal fields to transaction fields
- Invalidate `['transactions']` cache
- Add error toast in catch blocks so the user gets feedback if either auto-creation fails

### What Does NOT Happen

- The deal is **not** deleted, archived, or modified beyond the status change
- The deal remains fully visible and editable in the Deals hub
- No market listings are affected (unlike the separate "Log Transaction" flow which removes a market listing)

