-- Add new columns for site info
ALTER TABLE public.prospects
ADD COLUMN IF NOT EXISTS referral text,
ADD COLUMN IF NOT EXISTS loading text,
ADD COLUMN IF NOT EXISTS use_type text,
ADD COLUMN IF NOT EXISTS occupancy_date date,
ADD COLUMN IF NOT EXISTS yard_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS estimated_value numeric,
ADD COLUMN IF NOT EXISTS commission numeric;