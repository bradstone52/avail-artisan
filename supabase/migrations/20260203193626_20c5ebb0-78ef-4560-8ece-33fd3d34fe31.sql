-- Phase 1: Internal Listings Core Schema

-- Create internal_listings table
CREATE TABLE public.internal_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_number TEXT,
  org_id UUID REFERENCES public.orgs(id),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Property Details
  address TEXT NOT NULL,
  display_address TEXT,
  city TEXT NOT NULL DEFAULT '',
  submarket TEXT NOT NULL DEFAULT '',
  property_type TEXT, -- Industrial, Retail, Office, Land, Mixed-Use
  zoning TEXT,
  size_sf INTEGER,
  warehouse_sf INTEGER,
  office_sf INTEGER,
  clear_height_ft NUMERIC,
  power TEXT,
  yard TEXT,
  loading_type TEXT, -- dock, drive-in, both
  dock_doors INTEGER,
  drive_in_doors INTEGER,
  land_acres NUMERIC,
  latitude NUMERIC,
  longitude NUMERIC,
  
  -- Financials
  deal_type TEXT NOT NULL DEFAULT 'Lease', -- Lease, Sale, Both
  asking_rent_psf NUMERIC,
  asking_sale_price NUMERIC,
  op_costs NUMERIC,
  taxes NUMERIC,
  cam NUMERIC,
  
  -- Status & Assignment
  status TEXT NOT NULL DEFAULT 'Active', -- Active, Pending, Leased, Sold, Expired, Archived
  assigned_agent_id UUID REFERENCES public.agents(id),
  secondary_agent_id UUID REFERENCES public.agents(id),
  owner_id UUID, -- Reference to landlord/owner (future: landlords table)
  owner_name TEXT,
  owner_contact TEXT,
  
  -- Marketing Content
  description TEXT,
  broker_remarks TEXT,
  confidential_summary TEXT,
  
  -- Tracking
  published_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE,
  archived_reason TEXT,
  
  -- Photo
  photo_url TEXT
);

-- Create indexes for common queries
CREATE INDEX idx_internal_listings_org_id ON public.internal_listings(org_id);
CREATE INDEX idx_internal_listings_status ON public.internal_listings(status);
CREATE INDEX idx_internal_listings_assigned_agent ON public.internal_listings(assigned_agent_id);
CREATE INDEX idx_internal_listings_city ON public.internal_listings(city);
CREATE INDEX idx_internal_listings_deal_type ON public.internal_listings(deal_type);

-- Create internal_listing_status_history table for audit trail
CREATE TABLE public.internal_listing_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.internal_listings(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX idx_internal_listing_status_history_listing ON public.internal_listing_status_history(listing_id);

-- Enable RLS
ALTER TABLE public.internal_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_listing_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for internal_listings
CREATE POLICY "Org members can view internal listings"
ON public.internal_listings
FOR SELECT
USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can insert internal listings"
ON public.internal_listings
FOR INSERT
WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can update internal listings"
ON public.internal_listings
FOR UPDATE
USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can delete internal listings"
ON public.internal_listings
FOR DELETE
USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

-- RLS Policies for status history
CREATE POLICY "Org members can view status history"
ON public.internal_listing_status_history
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.internal_listings il
  WHERE il.id = internal_listing_status_history.listing_id
  AND il.org_id IN (SELECT get_user_org_ids(auth.uid()))
));

CREATE POLICY "Org members can insert status history"
ON public.internal_listing_status_history
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.internal_listings il
  WHERE il.id = internal_listing_status_history.listing_id
  AND il.org_id IN (SELECT get_user_org_ids(auth.uid()))
));

-- Trigger to auto-update updated_at
CREATE TRIGGER update_internal_listings_updated_at
BEFORE UPDATE ON public.internal_listings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to log status changes
CREATE OR REPLACE FUNCTION public.log_internal_listing_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.internal_listing_status_history (listing_id, previous_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER internal_listing_status_change_trigger
AFTER UPDATE ON public.internal_listings
FOR EACH ROW
EXECUTE FUNCTION public.log_internal_listing_status_change();

-- Create storage bucket for internal listing assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('internal-listing-assets', 'internal-listing-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for internal-listing-assets bucket
CREATE POLICY "Authenticated users can view internal listing assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'internal-listing-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload internal listing assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'internal-listing-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update internal listing assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'internal-listing-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete internal listing assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'internal-listing-assets' AND auth.uid() IS NOT NULL);