-- Add new columns for complete field mapping
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS listing_type text,
ADD COLUMN IF NOT EXISTS warehouse_sf integer,
ADD COLUMN IF NOT EXISTS office_sf integer,
ADD COLUMN IF NOT EXISTS voltage text,
ADD COLUMN IF NOT EXISTS cranes text,
ADD COLUMN IF NOT EXISTS crane_tons text,
ADD COLUMN IF NOT EXISTS building_depth text,
ADD COLUMN IF NOT EXISTS land_acres text,
ADD COLUMN IF NOT EXISTS zoning text,
ADD COLUMN IF NOT EXISTS mua text,
ADD COLUMN IF NOT EXISTS op_costs text,
ADD COLUMN IF NOT EXISTS gross_rate text,
ADD COLUMN IF NOT EXISTS sale_price text,
ADD COLUMN IF NOT EXISTS condo_fees text,
ADD COLUMN IF NOT EXISTS property_tax text,
ADD COLUMN IF NOT EXISTS sublease_exp text,
ADD COLUMN IF NOT EXISTS display_address text;