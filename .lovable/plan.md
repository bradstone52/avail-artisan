
## Fix Duplicate Properties and Prevent Future Duplicates

### Problem

The deal "3900 106 Avenue SE - Bay 21" was closed, which triggered a new transaction. The database trigger (`auto_create_property_from_transaction`) tried to match the address to an existing property, but because the deal address included " - Bay 21", it didn't match "3900 106 Avenue SE" and created a duplicate property (568,000 SF).

### Part 1: Data Cleanup (SQL migration)

Merge everything under the original 17,999 SF property and update its size to 568,000 SF:

- Re-point the transaction, tenant, and deal records from the duplicate property to the original
- Update the original property's size to 568,000 SF (the correct building size)
- Delete the duplicate property

### Part 2: Improve the Database Trigger

Update `auto_create_property_from_transaction()` to strip unit/bay suffixes before matching. The improved logic will:

1. Normalize the address by removing common suffixes like " - Bay 21", " - Unit 5", " Bay 3", etc.
2. Try to match on the stripped base address
3. If the deal already has a `property_id` set (from the form dropdown), skip auto-creation entirely and just preserve it

This prevents the trigger from creating duplicates when the transaction address has a unit identifier.

### Part 3: Improve the App-Level Duplicate Check

In `src/hooks/useDeals.ts`, the transaction duplicate check currently does an exact address match. Update it to also pass `property_id` when available, so if the deal is linked to a property, the check uses `property_id` instead of address matching (more reliable).

### Technical Details

**Database migration:**

```sql
-- 1. Re-point transaction, tenant, deal from duplicate to original property
UPDATE transactions SET property_id = '58838b4e-ed61-4634-9eba-7b3b07917260'
WHERE property_id = '49590c7b-80f9-4784-8329-f0060d703d87';

UPDATE property_tenants SET property_id = '58838b4e-ed61-4634-9eba-7b3b07917260'
WHERE property_id = '49590c7b-80f9-4784-8329-f0060d703d87';

UPDATE deals SET property_id = '58838b4e-ed61-4634-9eba-7b3b07917260'
WHERE property_id = '49590c7b-80f9-4784-8329-f0060d703d87';

-- 2. Update original property size
UPDATE properties SET size_sf = 568000
WHERE id = '58838b4e-ed61-4634-9eba-7b3b07917260';

-- 3. Delete duplicate
DELETE FROM properties
WHERE id = '49590c7b-80f9-4784-8329-f0060d703d87';
```

**Trigger update** -- strip unit/bay suffixes and respect pre-set `property_id`:

```sql
CREATE OR REPLACE FUNCTION public.auto_create_property_from_transaction()
...
  -- If property_id already set, keep it
  IF NEW.property_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Strip unit suffixes: " - Bay 21", " Unit 5", etc.
  base_address := regexp_replace(
    LOWER(TRIM(NEW.address)),
    '\s*[-]\s*(bay|unit|suite|ste)\s+\S+$', '', 'i'
  );

  -- Match on base address
  SELECT id INTO existing_property_id
  FROM properties
  WHERE LOWER(TRIM(address)) = base_address
     OR LOWER(TRIM(address)) = LOWER(TRIM(NEW.address))
  LIMIT 1;
  ...
```

**`src/hooks/useDeals.ts`** -- improve duplicate check to prefer `property_id`:

When the deal has a `property_id`, check for existing transactions by `property_id` + `org_id` instead of just address, making the match more reliable.
