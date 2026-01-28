-- Create deal_summary_actions table to store actions for Deal Summary
CREATE TABLE public.deal_summary_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  due_date DATE,
  due_time TEXT,
  date_met DATE,
  acting_party TEXT,
  description TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.deal_summary_actions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view deal summary actions in their org"
ON public.deal_summary_actions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM deals d
  WHERE d.id = deal_summary_actions.deal_id
  AND d.org_id IN (SELECT get_user_org_ids(auth.uid()))
));

CREATE POLICY "Users can insert deal summary actions in their org"
ON public.deal_summary_actions
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM deals d
  WHERE d.id = deal_summary_actions.deal_id
  AND d.org_id IN (SELECT get_user_org_ids(auth.uid()))
));

CREATE POLICY "Users can update deal summary actions in their org"
ON public.deal_summary_actions
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM deals d
  WHERE d.id = deal_summary_actions.deal_id
  AND d.org_id IN (SELECT get_user_org_ids(auth.uid()))
));

CREATE POLICY "Users can delete deal summary actions in their org"
ON public.deal_summary_actions
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM deals d
  WHERE d.id = deal_summary_actions.deal_id
  AND d.org_id IN (SELECT get_user_org_ids(auth.uid()))
));

-- Add due_time column to deal_deposits table for storing time information
ALTER TABLE public.deal_deposits ADD COLUMN IF NOT EXISTS due_time TEXT;