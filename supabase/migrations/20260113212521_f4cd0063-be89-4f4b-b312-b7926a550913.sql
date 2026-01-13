-- Drop the old user-based unique constraint
ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_user_listing_unique;

-- Also try the alternate naming convention
ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_user_id_listing_id_key;

-- Create new org-based unique index
CREATE UNIQUE INDEX IF NOT EXISTS listings_org_id_listing_id_key
  ON public.listings (org_id, listing_id);