
CREATE TABLE public.prospect_ideas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid REFERENCES public.orgs(id) ON DELETE CASCADE,
  created_by   uuid NOT NULL,
  name         text NOT NULL,
  title        text,
  company      text,
  email        text,
  phone        text,
  linkedin_url text,
  notes        text,
  source       text DEFAULT 'RocketReach',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE public.prospect_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view prospect ideas"
  ON public.prospect_ideas FOR SELECT
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can insert prospect ideas"
  ON public.prospect_ideas FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), org_id) AND created_by = auth.uid());

CREATE POLICY "Creators can update their prospect ideas"
  ON public.prospect_ideas FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Creators can delete their prospect ideas"
  ON public.prospect_ideas FOR DELETE
  USING (created_by = auth.uid());

CREATE TRIGGER update_prospect_ideas_updated_at
  BEFORE UPDATE ON public.prospect_ideas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
