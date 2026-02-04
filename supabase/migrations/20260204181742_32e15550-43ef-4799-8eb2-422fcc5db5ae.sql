-- Add new columns to internal_listings table
ALTER TABLE public.internal_listings
ADD COLUMN IF NOT EXISTS brochure_link text,
ADD COLUMN IF NOT EXISTS website_link text,
ADD COLUMN IF NOT EXISTS has_land boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS gross_rate numeric;