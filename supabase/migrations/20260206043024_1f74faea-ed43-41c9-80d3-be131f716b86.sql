-- Create table to store municipal mill rates
CREATE TABLE public.municipal_mill_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  municipality TEXT NOT NULL,
  mill_rate NUMERIC NOT NULL,
  rate_year INTEGER NOT NULL,
  org_id UUID REFERENCES public.orgs(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(municipality, org_id)
);

-- Enable RLS
ALTER TABLE public.municipal_mill_rates ENABLE ROW LEVEL SECURITY;

-- Policies for org members to manage mill rates
CREATE POLICY "Users can view mill rates for their org"
  ON public.municipal_mill_rates
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert mill rates for their org"
  ON public.municipal_mill_rates
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update mill rates for their org"
  ON public.municipal_mill_rates
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_municipal_mill_rates_updated_at
  BEFORE UPDATE ON public.municipal_mill_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();