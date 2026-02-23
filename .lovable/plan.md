
## Auto-Create Tenant When Deal Status Changes to "Closed"

When a deal's status is changed to "Closed" (and it's a lease-type deal), automatically create a tenant record in `property_tenants`.

### How It Works

1. The `useUpdateDeal` mutation in `src/hooks/useDeals.ts` will be enhanced
2. After a successful update, it checks:
   - Is the deal a lease-type? (Lease, Sublease, or Renewal)
   - Is the new status "Closed"?
   - Does the deal have a `buyer_name` (tenant)?
   - Does the deal have a `property_id`?
3. If all conditions are met, it queries `property_tenants` to check for an existing tenant with the same name on the same property
4. If no duplicate exists, it inserts a new tenant record with: `tenant_name`, `property_id`, `size_sf`, `lease_expiry` (from the deal's expiry date), and `tracked_by`
5. Invalidates the `all-tenants` cache so the Tenants hub updates immediately

### Technical Details

**File: `src/hooks/useDeals.ts`**

- Import `useAuth` is already present
- Modify `useUpdateDeal` to accept user context (need to add `useAuth` inside the hook)
- In `onSuccess`, add async logic that:
  - Checks `data.status === 'Closed'` and `['Lease', 'Sublease', 'Renewal'].includes(data.deal_type)`
  - Checks `data.buyer_name` and `data.property_id` are present
  - Queries `property_tenants` for duplicate check
  - Inserts a new record if none found
  - Invalidates `['all-tenants']` query key
- The `DealEditDialog` (and `DealFormDialog`) both use `useUpdateDeal`, so this will work regardless of which edit path the user takes

### No Database Changes Needed

The `property_tenants` table already has all required columns and RLS policies allow inserts when the user owns the property.
