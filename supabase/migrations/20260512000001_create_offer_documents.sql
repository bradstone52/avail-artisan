CREATE TABLE public.offer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID REFERENCES public.orgs(id),
  document_type TEXT NOT NULL DEFAULT 'offer_to_lease',
  tenant_name TEXT,
  premises_address TEXT,
  premises_city TEXT,
  docx_path TEXT,
  pdf_path TEXT,
  form_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.offer_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view offer documents"
  ON public.offer_documents FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can insert offer documents"
  ON public.offer_documents FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can update offer documents"
  ON public.offer_documents FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can delete offer documents"
  ON public.offer_documents FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE TRIGGER update_offer_documents_updated_at
  BEFORE UPDATE ON public.offer_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
