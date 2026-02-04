-- Add brochure_link, website_link, has_land, and gross_rate columns to market_listings
ALTER TABLE public.market_listings
ADD COLUMN IF NOT EXISTS brochure_link text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS website_link text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS has_land boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS gross_rate text DEFAULT NULL;

-- Migrate existing link data to brochure_link
UPDATE public.market_listings 
SET brochure_link = link 
WHERE link IS NOT NULL AND link != '';