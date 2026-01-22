-- Create assets table for cataloguing real estate properties and their owners
CREATE TABLE public.assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Property identification
  name text NOT NULL,
  address text NOT NULL,
  display_address text,
  city text NOT NULL DEFAULT '',
  submarket text NOT NULL DEFAULT '',
  
  -- Property specifications
  property_type text, -- Industrial, Office, Retail, Mixed-Use, Land, etc.
  size_sf integer,
  land_acres numeric,
  year_built integer,
  zoning text,
  building_class text, -- A, B, C
  clear_height_ft numeric,
  dock_doors integer,
  drive_in_doors integer,
  
  -- Owner information
  owner_name text,
  owner_company text,
  owner_email text,
  owner_phone text,
  
  -- Ownership history
  purchase_date date,
  purchase_price numeric,
  assessed_value numeric,
  property_tax_annual numeric,
  
  -- Additional details
  photo_url text,
  notes text,
  internal_notes text,
  
  -- Geocoding
  latitude numeric,
  longitude numeric,
  geocoded_at timestamp with time zone,
  geocode_source text,
  
  -- Metadata
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create junction table for manual asset-to-listing links
CREATE TABLE public.asset_listing_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  market_listing_id uuid NOT NULL REFERENCES public.market_listings(id) ON DELETE CASCADE,
  link_type text NOT NULL DEFAULT 'manual', -- 'manual' or 'auto'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  -- Prevent duplicate links
  UNIQUE(asset_id, market_listing_id)
);

-- Enable RLS on assets
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Assets are shared workspace-wide, so all authenticated users can view
CREATE POLICY "Authenticated users can view assets"
ON public.assets
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert assets"
ON public.assets
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update assets"
ON public.assets
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete assets"
ON public.assets
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Enable RLS on asset_listing_links
ALTER TABLE public.asset_listing_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view asset links"
ON public.asset_listing_links
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert asset links"
ON public.asset_listing_links
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update asset links"
ON public.asset_listing_links
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete asset links"
ON public.asset_listing_links
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX idx_assets_address ON public.assets(address);
CREATE INDEX idx_assets_city ON public.assets(city);
CREATE INDEX idx_assets_owner_company ON public.assets(owner_company);
CREATE INDEX idx_asset_listing_links_asset_id ON public.asset_listing_links(asset_id);
CREATE INDEX idx_asset_listing_links_market_listing_id ON public.asset_listing_links(market_listing_id);

-- Trigger for updated_at
CREATE TRIGGER update_assets_updated_at
BEFORE UPDATE ON public.assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();