-- Add industrial feature fields to internal_listings
ALTER TABLE public.internal_listings
ADD COLUMN has_sprinklers boolean DEFAULT false,
ADD COLUMN sprinklers_esfr boolean DEFAULT false,
ADD COLUMN has_led_lighting boolean DEFAULT false,
ADD COLUMN has_rail_access boolean DEFAULT false,
ADD COLUMN has_heated boolean DEFAULT false,
ADD COLUMN has_air_conditioning boolean DEFAULT false;