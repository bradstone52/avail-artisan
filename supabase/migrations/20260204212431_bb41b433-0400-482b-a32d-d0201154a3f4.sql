-- Create table for property tours on internal listings
CREATE TABLE public.internal_listing_tours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.internal_listings(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.orgs(id),
  tour_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  touring_party_name TEXT,
  touring_party_company TEXT,
  touring_party_phone TEXT,
  touring_party_email TEXT,
  touring_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.internal_listing_tours ENABLE ROW LEVEL SECURITY;

-- RLS policies for org-based access
CREATE POLICY "Users can view tours in their org"
  ON public.internal_listing_tours
  FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Users can create tours in their org"
  ON public.internal_listing_tours
  FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Users can update tours in their org"
  ON public.internal_listing_tours
  FOR UPDATE
  USING (org_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Users can delete tours in their org"
  ON public.internal_listing_tours
  FOR DELETE
  USING (org_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- Index for faster queries
CREATE INDEX idx_internal_listing_tours_listing_id ON public.internal_listing_tours(listing_id);
CREATE INDEX idx_internal_listing_tours_org_id ON public.internal_listing_tours(org_id);