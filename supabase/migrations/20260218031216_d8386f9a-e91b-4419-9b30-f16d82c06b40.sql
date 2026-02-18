-- Add development_name column to market_listings
ALTER TABLE public.market_listings
ADD COLUMN development_name text;

-- Index for grouping/filtering by development
CREATE INDEX idx_market_listings_development_name ON public.market_listings (development_name)
WHERE development_name IS NOT NULL;