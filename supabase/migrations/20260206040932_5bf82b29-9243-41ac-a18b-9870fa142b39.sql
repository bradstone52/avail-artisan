-- Add new fields to internal_listings table
ALTER TABLE public.internal_listings 
ADD COLUMN IF NOT EXISTS second_floor_office_sf integer,
ADD COLUMN IF NOT EXISTS drive_in_door_dimensions jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS additional_features text,
ADD COLUMN IF NOT EXISTS assessed_value numeric,
ADD COLUMN IF NOT EXISTS estimated_annual_tax numeric;

-- Add comments for documentation
COMMENT ON COLUMN public.internal_listings.second_floor_office_sf IS 'Second floor office square footage';
COMMENT ON COLUMN public.internal_listings.drive_in_door_dimensions IS 'Array of drive-in door dimension strings, e.g. ["12x14", "14x16"]';
COMMENT ON COLUMN public.internal_listings.additional_features IS 'Free text field for additional property features';
COMMENT ON COLUMN public.internal_listings.assessed_value IS 'Property assessed value for tax calculation';
COMMENT ON COLUMN public.internal_listings.estimated_annual_tax IS 'Estimated annual property tax';