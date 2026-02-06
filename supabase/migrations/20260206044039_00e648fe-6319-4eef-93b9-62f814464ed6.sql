-- Add Make Up Air (MUA) fields to internal_listings
ALTER TABLE public.internal_listings
ADD COLUMN has_mua boolean DEFAULT false,
ADD COLUMN mua_units integer,
ADD COLUMN mua_cfm_ratings jsonb;