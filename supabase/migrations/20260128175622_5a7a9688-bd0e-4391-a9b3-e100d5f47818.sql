
-- Create deal_documents table for file uploads
CREATE TABLE public.deal_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deal_conditions table for multiple conditions per deal
CREATE TABLE public.deal_conditions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  due_date DATE,
  is_satisfied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deal_deposits table
CREATE TABLE public.deal_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  held_by TEXT,
  due_date DATE,
  received BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to deals table for expanded deal sheet
ALTER TABLE public.deals
ADD COLUMN IF NOT EXISTS size_sf INTEGER,
ADD COLUMN IF NOT EXISTS closing_date DATE,
ADD COLUMN IF NOT EXISTS lease_value NUMERIC,
ADD COLUMN IF NOT EXISTS seller_name TEXT,
ADD COLUMN IF NOT EXISTS seller_brokerage_id UUID REFERENCES public.brokerages(id),
ADD COLUMN IF NOT EXISTS buyer_name TEXT,
ADD COLUMN IF NOT EXISTS buyer_brokerage_id UUID REFERENCES public.brokerages(id),
ADD COLUMN IF NOT EXISTS listing_agent1_id UUID REFERENCES public.agents(id),
ADD COLUMN IF NOT EXISTS listing_agent2_id UUID REFERENCES public.agents(id),
ADD COLUMN IF NOT EXISTS selling_agent1_id UUID REFERENCES public.agents(id),
ADD COLUMN IF NOT EXISTS selling_agent2_id UUID REFERENCES public.agents(id),
ADD COLUMN IF NOT EXISTS cv_agent_id UUID REFERENCES public.agents(id),
ADD COLUMN IF NOT EXISTS listing_brokerage_id UUID REFERENCES public.brokerages(id),
ADD COLUMN IF NOT EXISTS selling_brokerage_id UUID REFERENCES public.brokerages(id),
ADD COLUMN IF NOT EXISTS other_brokerage_percent NUMERIC DEFAULT 1.5,
ADD COLUMN IF NOT EXISTS clearview_percent NUMERIC DEFAULT 1.5,
ADD COLUMN IF NOT EXISTS gst_rate NUMERIC DEFAULT 5;

-- Enable RLS on new tables
ALTER TABLE public.deal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_deposits ENABLE ROW LEVEL SECURITY;

-- RLS policies for deal_documents (based on deal's org)
CREATE POLICY "Users can view deal documents in their org" ON public.deal_documents
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_id AND d.org_id IN (SELECT get_user_org_ids(auth.uid()))
  )
);

CREATE POLICY "Users can insert deal documents in their org" ON public.deal_documents
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_id AND d.org_id IN (SELECT get_user_org_ids(auth.uid()))
  )
);

CREATE POLICY "Users can delete deal documents in their org" ON public.deal_documents
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_id AND d.org_id IN (SELECT get_user_org_ids(auth.uid()))
  )
);

-- RLS policies for deal_conditions
CREATE POLICY "Users can view deal conditions in their org" ON public.deal_conditions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_id AND d.org_id IN (SELECT get_user_org_ids(auth.uid()))
  )
);

CREATE POLICY "Users can insert deal conditions in their org" ON public.deal_conditions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_id AND d.org_id IN (SELECT get_user_org_ids(auth.uid()))
  )
);

CREATE POLICY "Users can update deal conditions in their org" ON public.deal_conditions
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_id AND d.org_id IN (SELECT get_user_org_ids(auth.uid()))
  )
);

CREATE POLICY "Users can delete deal conditions in their org" ON public.deal_conditions
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_id AND d.org_id IN (SELECT get_user_org_ids(auth.uid()))
  )
);

-- RLS policies for deal_deposits
CREATE POLICY "Users can view deal deposits in their org" ON public.deal_deposits
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_id AND d.org_id IN (SELECT get_user_org_ids(auth.uid()))
  )
);

CREATE POLICY "Users can insert deal deposits in their org" ON public.deal_deposits
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_id AND d.org_id IN (SELECT get_user_org_ids(auth.uid()))
  )
);

CREATE POLICY "Users can update deal deposits in their org" ON public.deal_deposits
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_id AND d.org_id IN (SELECT get_user_org_ids(auth.uid()))
  )
);

CREATE POLICY "Users can delete deal deposits in their org" ON public.deal_deposits
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_id AND d.org_id IN (SELECT get_user_org_ids(auth.uid()))
  )
);
