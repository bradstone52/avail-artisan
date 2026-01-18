-- Add geocoding columns to listings table
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS geocoded_at timestamptz,
ADD COLUMN IF NOT EXISTS geocode_source text;

-- Add org_id to share_links for proper scoping
ALTER TABLE public.share_links 
ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.orgs(id);

-- Create index on listings(org_id) for efficient queries
CREATE INDEX IF NOT EXISTS idx_listings_org_id ON public.listings(org_id);

-- Create index on listings(listing_id) for deduplication
CREATE INDEX IF NOT EXISTS idx_listings_listing_id ON public.listings(listing_id);

-- Create index on share_links(org_id)
CREATE INDEX IF NOT EXISTS idx_share_links_org_id ON public.share_links(org_id);

-- Create unique constraint on org_id + listing_id for deduplication within an org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listings_org_listing_unique'
  ) THEN
    ALTER TABLE public.listings ADD CONSTRAINT listings_org_listing_unique UNIQUE (org_id, listing_id);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;