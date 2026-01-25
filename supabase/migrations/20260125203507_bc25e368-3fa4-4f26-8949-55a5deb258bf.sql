-- Add download_method column to track how brochure was downloaded
ALTER TABLE public.property_brochures 
ADD COLUMN download_method text DEFAULT 'direct';

-- Add comment for clarity
COMMENT ON COLUMN public.property_brochures.download_method IS 'How the brochure was downloaded: direct, firecrawl';