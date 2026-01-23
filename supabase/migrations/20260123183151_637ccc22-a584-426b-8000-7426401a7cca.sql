-- Drop Asset Manager tables (no longer needed)
DROP TABLE IF EXISTS public.asset_to_asset_manager CASCADE;
DROP TABLE IF EXISTS public.asset_manager_contacts CASCADE;
DROP TABLE IF EXISTS public.asset_managers CASCADE;

-- Rename assets table to properties
ALTER TABLE public.assets RENAME TO properties;

-- Rename asset_photos to property_photos
ALTER TABLE public.asset_photos RENAME TO property_photos;
ALTER TABLE public.property_photos RENAME COLUMN asset_id TO property_id;

-- Rename asset_listing_links to property_listing_links
ALTER TABLE public.asset_listing_links RENAME TO property_listing_links;
ALTER TABLE public.property_listing_links RENAME COLUMN asset_id TO property_id;

-- Remove owner columns from properties (they're being removed)
ALTER TABLE public.properties 
  DROP COLUMN IF EXISTS owner_name,
  DROP COLUMN IF EXISTS owner_company,
  DROP COLUMN IF EXISTS owner_email,
  DROP COLUMN IF EXISTS owner_phone,
  DROP COLUMN IF EXISTS purchase_date,
  DROP COLUMN IF EXISTS purchase_price;

-- Add City of Calgary data columns
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS roll_number text,
  ADD COLUMN IF NOT EXISTS assessed_land_value numeric,
  ADD COLUMN IF NOT EXISTS assessed_improvement_value numeric,
  ADD COLUMN IF NOT EXISTS tax_class text,
  ADD COLUMN IF NOT EXISTS legal_description text,
  ADD COLUMN IF NOT EXISTS land_use_designation text,
  ADD COLUMN IF NOT EXISTS community_name text,
  ADD COLUMN IF NOT EXISTS city_data_fetched_at timestamptz,
  ADD COLUMN IF NOT EXISTS city_data_raw jsonb;

-- Create property_brochures table for historical brochure archive
CREATE TABLE public.property_brochures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  market_listing_id uuid REFERENCES public.market_listings(id) ON DELETE SET NULL,
  listing_id text, -- Copy of listing_id for reference even if market_listing is deleted
  original_url text NOT NULL, -- The source URL the PDF was downloaded from
  storage_path text NOT NULL, -- Path in Supabase storage
  file_size integer,
  downloaded_at timestamptz NOT NULL DEFAULT now(),
  listing_snapshot jsonb, -- Snapshot of listing data at download time
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create property_permits table for City of Calgary permits
CREATE TABLE public.property_permits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  permit_number text NOT NULL,
  permit_type text NOT NULL, -- 'building' or 'development'
  permit_class text,
  description text,
  status text,
  applied_date date,
  issued_date date,
  completed_date date,
  estimated_value numeric,
  contractor_name text,
  raw_data jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.property_brochures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_permits ENABLE ROW LEVEL SECURITY;

-- RLS policies for property_brochures
CREATE POLICY "Authenticated users can view property brochures"
  ON public.property_brochures FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert property brochures"
  ON public.property_brochures FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update property brochures"
  ON public.property_brochures FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete property brochures"
  ON public.property_brochures FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- RLS policies for property_permits
CREATE POLICY "Authenticated users can view property permits"
  ON public.property_permits FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert property permits"
  ON public.property_permits FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update property permits"
  ON public.property_permits FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete property permits"
  ON public.property_permits FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Update RLS policy names for renamed tables
DROP POLICY IF EXISTS "Authenticated users can view asset links" ON public.property_listing_links;
DROP POLICY IF EXISTS "Authenticated users can insert asset links" ON public.property_listing_links;
DROP POLICY IF EXISTS "Authenticated users can update asset links" ON public.property_listing_links;
DROP POLICY IF EXISTS "Authenticated users can delete asset links" ON public.property_listing_links;

CREATE POLICY "Authenticated users can view property links"
  ON public.property_listing_links FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert property links"
  ON public.property_listing_links FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update property links"
  ON public.property_listing_links FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete property links"
  ON public.property_listing_links FOR DELETE
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can view asset photos" ON public.property_photos;
DROP POLICY IF EXISTS "Authenticated users can insert asset photos" ON public.property_photos;
DROP POLICY IF EXISTS "Authenticated users can update asset photos" ON public.property_photos;
DROP POLICY IF EXISTS "Authenticated users can delete asset photos" ON public.property_photos;

CREATE POLICY "Authenticated users can view property photos"
  ON public.property_photos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert property photos"
  ON public.property_photos FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update property photos"
  ON public.property_photos FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete property photos"
  ON public.property_photos FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Rename RLS policies on properties table
DROP POLICY IF EXISTS "Authenticated users can view assets" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can insert assets" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can update assets" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can delete assets" ON public.properties;

CREATE POLICY "Authenticated users can view properties"
  ON public.properties FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert properties"
  ON public.properties FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update properties"
  ON public.properties FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete properties"
  ON public.properties FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_property_brochures_property_id ON public.property_brochures(property_id);
CREATE INDEX IF NOT EXISTS idx_property_brochures_downloaded_at ON public.property_brochures(downloaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_property_permits_property_id ON public.property_permits(property_id);
CREATE INDEX IF NOT EXISTS idx_properties_address ON public.properties(address);

-- Create storage bucket for property brochures
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-brochures', 'property-brochures', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for property-brochures bucket
CREATE POLICY "Authenticated users can view property brochures storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-brochures' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload property brochures storage"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'property-brochures' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update property brochures storage"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'property-brochures' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete property brochures storage"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'property-brochures' AND auth.uid() IS NOT NULL);