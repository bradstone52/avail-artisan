-- Create prospect_follow_up_dates table for multiple follow-up dates per prospect
CREATE TABLE public.prospect_follow_up_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  notes TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prospect_follow_up_dates ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can manage dates for prospects in their org
CREATE POLICY "Users can view follow-up dates for their org prospects"
ON public.prospect_follow_up_dates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.prospects p
    WHERE p.id = prospect_follow_up_dates.prospect_id
    AND p.org_id IN (SELECT get_user_org_ids(auth.uid()))
  )
);

CREATE POLICY "Users can insert follow-up dates for their org prospects"
ON public.prospect_follow_up_dates
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.prospects p
    WHERE p.id = prospect_follow_up_dates.prospect_id
    AND p.org_id IN (SELECT get_user_org_ids(auth.uid()))
  )
);

CREATE POLICY "Users can update follow-up dates for their org prospects"
ON public.prospect_follow_up_dates
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.prospects p
    WHERE p.id = prospect_follow_up_dates.prospect_id
    AND p.org_id IN (SELECT get_user_org_ids(auth.uid()))
  )
);

CREATE POLICY "Users can delete follow-up dates for their org prospects"
ON public.prospect_follow_up_dates
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.prospects p
    WHERE p.id = prospect_follow_up_dates.prospect_id
    AND p.org_id IN (SELECT get_user_org_ids(auth.uid()))
  )
);

-- Add updated_at trigger
CREATE TRIGGER update_prospect_follow_up_dates_updated_at
BEFORE UPDATE ON public.prospect_follow_up_dates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_prospect_follow_up_dates_prospect_id ON public.prospect_follow_up_dates(prospect_id);