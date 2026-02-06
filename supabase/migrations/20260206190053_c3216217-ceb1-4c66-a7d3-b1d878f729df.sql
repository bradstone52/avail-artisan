
-- Track which brokerages have sent their monthly updates
CREATE TABLE public.brokerage_update_checks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.orgs(id),
  brokerage_name text NOT NULL,
  check_month integer NOT NULL, -- 1-12
  check_year integer NOT NULL,
  checked boolean NOT NULL DEFAULT false,
  checked_at timestamp with time zone,
  checked_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(org_id, brokerage_name, check_month, check_year)
);

ALTER TABLE public.brokerage_update_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view update checks"
  ON public.brokerage_update_checks FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can insert update checks"
  ON public.brokerage_update_checks FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can update update checks"
  ON public.brokerage_update_checks FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can delete update checks"
  ON public.brokerage_update_checks FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
