
-- Add drive_in_door_dimensions column to market_listings
ALTER TABLE public.market_listings ADD COLUMN drive_in_door_dimensions jsonb NULL;

-- Add drive_in_door_dimensions column to properties
ALTER TABLE public.properties ADD COLUMN drive_in_door_dimensions jsonb NULL;
