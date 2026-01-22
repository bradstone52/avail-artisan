-- Drop the existing foreign key constraint that references listings table
ALTER TABLE public.issue_listings 
DROP CONSTRAINT IF EXISTS issue_listings_listing_id_fkey;

-- Add new foreign key constraint that references market_listings table
ALTER TABLE public.issue_listings 
ADD CONSTRAINT issue_listings_listing_id_fkey 
FOREIGN KEY (listing_id) REFERENCES public.market_listings(id) ON DELETE CASCADE;