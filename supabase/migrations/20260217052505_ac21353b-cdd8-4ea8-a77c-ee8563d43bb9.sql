
-- Create landlord_websites table for storing landlord website URLs
CREATE TABLE public.landlord_websites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  landlord_name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  notes TEXT,
  last_crawled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE(org_id, landlord_name)
);

-- Enable RLS
ALTER TABLE public.landlord_websites ENABLE ROW LEVEL SECURITY;

-- RLS policies scoped to org membership
CREATE POLICY "Users can view landlord websites in their org"
  ON public.landlord_websites FOR SELECT
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Users can insert landlord websites in their org"
  ON public.landlord_websites FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Users can update landlord websites in their org"
  ON public.landlord_websites FOR UPDATE
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Users can delete landlord websites in their org"
  ON public.landlord_websites FOR DELETE
  USING (public.is_org_member(auth.uid(), org_id));

-- Trigger for updated_at
CREATE TRIGGER update_landlord_websites_updated_at
  BEFORE UPDATE ON public.landlord_websites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
