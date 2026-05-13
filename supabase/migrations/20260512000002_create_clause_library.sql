CREATE TABLE public.clause_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID REFERENCES public.orgs(id),
  document_type TEXT NOT NULL DEFAULT 'offer_to_lease',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.clause_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view clauses"
  ON public.clause_library FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can insert clauses"
  ON public.clause_library FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can update clauses"
  ON public.clause_library FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can delete clauses"
  ON public.clause_library FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE TRIGGER update_clause_library_updated_at
  BEFORE UPDATE ON public.clause_library
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
