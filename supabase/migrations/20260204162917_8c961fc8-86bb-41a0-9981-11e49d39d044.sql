-- Create internal_listing_inquiries table
CREATE TABLE public.internal_listing_inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.internal_listings(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.orgs(id),
  
  -- Contact info
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  contact_company TEXT,
  
  -- Lead tracking
  source TEXT NOT NULL DEFAULT 'Direct',
  stage TEXT NOT NULL DEFAULT 'New',
  assigned_broker_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  
  -- Additional info
  notes TEXT,
  next_follow_up DATE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create internal_listing_inquiry_timeline table
CREATE TABLE public.internal_listing_inquiry_timeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inquiry_id UUID NOT NULL REFERENCES public.internal_listing_inquiries(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.orgs(id),
  
  event_type TEXT NOT NULL,
  notes TEXT,
  event_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.internal_listing_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_listing_inquiry_timeline ENABLE ROW LEVEL SECURITY;

-- RLS policies for internal_listing_inquiries
CREATE POLICY "Users can view inquiries for their org listings"
  ON public.internal_listing_inquiries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.internal_listings il
      JOIN public.org_members om ON om.org_id = il.org_id
      WHERE il.id = internal_listing_inquiries.listing_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create inquiries for their org listings"
  ON public.internal_listing_inquiries
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.internal_listings il
      JOIN public.org_members om ON om.org_id = il.org_id
      WHERE il.id = listing_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update inquiries for their org listings"
  ON public.internal_listing_inquiries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.internal_listings il
      JOIN public.org_members om ON om.org_id = il.org_id
      WHERE il.id = internal_listing_inquiries.listing_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete inquiries for their org listings"
  ON public.internal_listing_inquiries
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.internal_listings il
      JOIN public.org_members om ON om.org_id = il.org_id
      WHERE il.id = internal_listing_inquiries.listing_id
      AND om.user_id = auth.uid()
    )
  );

-- RLS policies for internal_listing_inquiry_timeline
CREATE POLICY "Users can view timeline for their org inquiries"
  ON public.internal_listing_inquiry_timeline
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.internal_listing_inquiries inq
      JOIN public.internal_listings il ON il.id = inq.listing_id
      JOIN public.org_members om ON om.org_id = il.org_id
      WHERE inq.id = internal_listing_inquiry_timeline.inquiry_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create timeline events for their org inquiries"
  ON public.internal_listing_inquiry_timeline
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.internal_listing_inquiries inq
      JOIN public.internal_listings il ON il.id = inq.listing_id
      JOIN public.org_members om ON om.org_id = il.org_id
      WHERE inq.id = inquiry_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update timeline events for their org inquiries"
  ON public.internal_listing_inquiry_timeline
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.internal_listing_inquiries inq
      JOIN public.internal_listings il ON il.id = inq.listing_id
      JOIN public.org_members om ON om.org_id = il.org_id
      WHERE inq.id = internal_listing_inquiry_timeline.inquiry_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete timeline events for their org inquiries"
  ON public.internal_listing_inquiry_timeline
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.internal_listing_inquiries inq
      JOIN public.internal_listings il ON il.id = inq.listing_id
      JOIN public.org_members om ON om.org_id = il.org_id
      WHERE inq.id = internal_listing_inquiry_timeline.inquiry_id
      AND om.user_id = auth.uid()
    )
  );

-- Create trigger for updated_at on inquiries
CREATE TRIGGER update_internal_listing_inquiries_updated_at
  BEFORE UPDATE ON public.internal_listing_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_internal_listing_inquiries_listing_id ON public.internal_listing_inquiries(listing_id);
CREATE INDEX idx_internal_listing_inquiries_stage ON public.internal_listing_inquiries(stage);
CREATE INDEX idx_internal_listing_inquiry_timeline_inquiry_id ON public.internal_listing_inquiry_timeline(inquiry_id);