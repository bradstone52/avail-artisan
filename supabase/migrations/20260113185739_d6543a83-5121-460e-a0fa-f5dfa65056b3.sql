-- Add size threshold columns to sync_settings
ALTER TABLE public.sync_settings 
ADD COLUMN IF NOT EXISTS size_threshold_min integer NOT NULL DEFAULT 100000,
ADD COLUMN IF NOT EXISTS size_threshold_max integer NOT NULL DEFAULT 500000;

-- Update the initial row if it exists
UPDATE public.sync_settings SET 
  size_threshold_min = 100000,
  size_threshold_max = 500000
WHERE size_threshold_min IS NULL OR size_threshold_max IS NULL;