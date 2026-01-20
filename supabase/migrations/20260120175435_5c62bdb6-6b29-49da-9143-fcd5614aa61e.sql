-- Create market_listings table for ALL active listings (not just distribution)
-- This is a parallel system to avoid disrupting the current sync

CREATE TABLE public.market_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES public.orgs(id),
  user_id UUID NOT NULL,
  
  -- Identity (from Google Sheet)
  listing_id TEXT NOT NULL,
  
  -- Core property info
  address TEXT NOT NULL,
  display_address TEXT,
  city TEXT NOT NULL DEFAULT '',
  submarket TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Active',
  listing_type TEXT,
  
  -- Specs
  size_sf INTEGER NOT NULL DEFAULT 0,
  warehouse_sf INTEGER,
  office_sf INTEGER,
  clear_height_ft NUMERIC,
  dock_doors INTEGER DEFAULT 0,
  drive_in_doors INTEGER DEFAULT 0,
  power_amps TEXT,
  voltage TEXT,
  yard TEXT DEFAULT 'Unknown',
  yard_area TEXT,
  sprinkler TEXT,
  cranes TEXT,
  crane_tons TEXT,
  building_depth TEXT,
  land_acres TEXT,
  zoning TEXT,
  mua TEXT,
  cross_dock TEXT DEFAULT 'Unknown',
  trailer_parking TEXT DEFAULT 'Unknown',
  
  -- Commercial terms
  availability_date TEXT,
  asking_rate_psf TEXT,
  op_costs TEXT,
  gross_rate TEXT,
  sale_price TEXT,
  condo_fees TEXT,
  property_tax TEXT,
  landlord TEXT,
  sublease_exp TEXT,
  broker_source TEXT,
  
  -- Notes
  notes_public TEXT,
  internal_note TEXT,
  
  -- Geocoding
  latitude NUMERIC,
  longitude NUMERIC,
  geocoded_at TIMESTAMP WITH TIME ZONE,
  geocode_source TEXT,
  
  -- Last verified from sheet
  last_verified_date DATE,
  
  -- Distribution flag (from sheet's "Distribution Warehouse?" column)
  is_distribution_warehouse BOOLEAN DEFAULT false,
  
  -- Brochure link info
  link TEXT,
  link_status TEXT,
  link_last_checked TIMESTAMP WITH TIME ZONE,
  brochure_search_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint per org
  CONSTRAINT market_listings_listing_id_org_unique UNIQUE (listing_id, org_id)
);

-- Enable RLS
ALTER TABLE public.market_listings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (same pattern as listings table)
CREATE POLICY "Org members can view market listings"
  ON public.market_listings FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can insert market listings"
  ON public.market_listings FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can update market listings"
  ON public.market_listings FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can delete market listings"
  ON public.market_listings FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

-- Create index for common queries
CREATE INDEX idx_market_listings_org_id ON public.market_listings(org_id);
CREATE INDEX idx_market_listings_status ON public.market_listings(status);
CREATE INDEX idx_market_listings_link_status ON public.market_listings(link_status);
CREATE INDEX idx_market_listings_city ON public.market_listings(city);

-- Trigger for updated_at
CREATE TRIGGER update_market_listings_updated_at
  BEFORE UPDATE ON public.market_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create market_sync_logs table to track market sync separately
CREATE TABLE public.market_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES public.orgs(id),
  run_type TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  triggered_by UUID,
  rows_read INTEGER DEFAULT 0,
  rows_imported INTEGER DEFAULT 0,
  rows_skipped INTEGER DEFAULT 0,
  skipped_breakdown JSONB DEFAULT '{}',
  links_checked INTEGER DEFAULT 0,
  links_ok INTEGER DEFAULT 0,
  links_bad INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.market_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view market sync logs"
  ON public.market_sync_logs FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Sync operators can insert market sync logs"
  ON public.market_sync_logs FOR INSERT
  WITH CHECK (can_run_sync(auth.uid()));

CREATE POLICY "Sync operators can update their market sync logs"
  ON public.market_sync_logs FOR UPDATE
  USING (can_run_sync(auth.uid()) AND triggered_by = auth.uid());

CREATE POLICY "Admins can manage market sync logs"
  ON public.market_sync_logs FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));