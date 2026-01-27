-- Create deals table
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID REFERENCES public.orgs(id),
  deal_number TEXT,
  deal_type TEXT NOT NULL DEFAULT 'Lease',
  address TEXT NOT NULL,
  city TEXT DEFAULT '',
  submarket TEXT DEFAULT '',
  deal_value NUMERIC,
  commission_percent NUMERIC,
  close_date DATE,
  status TEXT NOT NULL DEFAULT 'Active',
  conditions TEXT,
  deposit_amount NUMERIC,
  deposit_due_date DATE,
  listing_id UUID REFERENCES public.market_listings(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prospects table
CREATE TABLE public.prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID REFERENCES public.orgs(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  requirements TEXT,
  min_size INTEGER,
  max_size INTEGER,
  budget NUMERIC,
  follow_up_date DATE,
  status TEXT NOT NULL DEFAULT 'New',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create brokerages table
CREATE TABLE public.brokerages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID REFERENCES public.orgs(id),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agents table
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID REFERENCES public.orgs(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  brokerage_id UUID REFERENCES public.brokerages(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brokerages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- RLS policies for deals (org-based access)
CREATE POLICY "Org members can view deals"
  ON public.deals FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can insert deals"
  ON public.deals FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can update deals"
  ON public.deals FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can delete deals"
  ON public.deals FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

-- RLS policies for prospects (org-based access)
CREATE POLICY "Org members can view prospects"
  ON public.prospects FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can insert prospects"
  ON public.prospects FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can update prospects"
  ON public.prospects FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can delete prospects"
  ON public.prospects FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

-- RLS policies for brokerages (org-based access)
CREATE POLICY "Org members can view brokerages"
  ON public.brokerages FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can insert brokerages"
  ON public.brokerages FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can update brokerages"
  ON public.brokerages FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can delete brokerages"
  ON public.brokerages FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

-- RLS policies for agents (org-based access)
CREATE POLICY "Org members can view agents"
  ON public.agents FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can insert agents"
  ON public.agents FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can update agents"
  ON public.agents FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can delete agents"
  ON public.agents FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

-- Create updated_at triggers
CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prospects_updated_at
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_brokerages_updated_at
  BEFORE UPDATE ON public.brokerages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create deals storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('deals', 'deals', false);

-- Storage policies for deals bucket
CREATE POLICY "Authenticated users can view deal files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'deals' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload deal files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'deals' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update deal files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'deals' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete deal files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'deals' AND auth.uid() IS NOT NULL);