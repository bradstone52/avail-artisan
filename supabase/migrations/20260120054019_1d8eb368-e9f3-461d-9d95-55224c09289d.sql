-- Add a column to store a snapshot of listings at the time the share link was created
-- This ensures PDFs always show the same data even after listings are synced/deleted
ALTER TABLE public.share_links 
ADD COLUMN IF NOT EXISTS listing_snapshot JSONB DEFAULT NULL;

-- Add a comment explaining the column
COMMENT ON COLUMN public.share_links.listing_snapshot IS 'Frozen snapshot of listing data at share link creation time. Used for PDF interactive maps to ensure data persists even after syncs.';