
-- Create underwritings table
CREATE TABLE public.underwritings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  property_name text NOT NULL,
  address text NOT NULL,
  submarket text NOT NULL,
  building_size_sf numeric,
  year_built integer,
  land_size_ac numeric,
  proposed_ask_price numeric,
  status text NOT NULL DEFAULT 'draft',
  phase_completion jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create underwriting_documents table
CREATE TABLE public.underwriting_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  underwriting_id uuid REFERENCES public.underwritings(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create underwriting_phase_data table
CREATE TABLE public.underwriting_phase_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  underwriting_id uuid REFERENCES public.underwritings(id) ON DELETE CASCADE,
  phase integer NOT NULL,
  raw_perplexity_response text,
  structured_data jsonb,
  broker_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (underwriting_id, phase)
);

-- Updated_at trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION public.update_underwriting_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_underwritings_updated_at
  BEFORE UPDATE ON public.underwritings
  FOR EACH ROW EXECUTE FUNCTION public.update_underwriting_updated_at();

CREATE TRIGGER update_underwriting_phase_data_updated_at
  BEFORE UPDATE ON public.underwriting_phase_data
  FOR EACH ROW EXECUTE FUNCTION public.update_underwriting_updated_at();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('underwriting-docs', 'underwriting-docs', false)
  ON CONFLICT (id) DO NOTHING;

-- RLS: underwritings
ALTER TABLE public.underwritings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view underwritings"
  ON public.underwritings FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can insert underwritings"
  ON public.underwritings FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())) AND user_id = auth.uid());

CREATE POLICY "Org members can update underwritings"
  ON public.underwritings FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can delete underwritings"
  ON public.underwritings FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

-- RLS: underwriting_documents
ALTER TABLE public.underwriting_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view underwriting documents"
  ON public.underwriting_documents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.underwritings u
    WHERE u.id = underwriting_documents.underwriting_id
      AND u.org_id IN (SELECT get_user_org_ids(auth.uid()))
  ));

CREATE POLICY "Org members can insert underwriting documents"
  ON public.underwriting_documents FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.underwritings u
    WHERE u.id = underwriting_documents.underwriting_id
      AND u.org_id IN (SELECT get_user_org_ids(auth.uid()))
  ));

CREATE POLICY "Org members can delete underwriting documents"
  ON public.underwriting_documents FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.underwritings u
    WHERE u.id = underwriting_documents.underwriting_id
      AND u.org_id IN (SELECT get_user_org_ids(auth.uid()))
  ));

-- RLS: underwriting_phase_data
ALTER TABLE public.underwriting_phase_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view underwriting phase data"
  ON public.underwriting_phase_data FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.underwritings u
    WHERE u.id = underwriting_phase_data.underwriting_id
      AND u.org_id IN (SELECT get_user_org_ids(auth.uid()))
  ));

CREATE POLICY "Org members can insert underwriting phase data"
  ON public.underwriting_phase_data FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.underwritings u
    WHERE u.id = underwriting_phase_data.underwriting_id
      AND u.org_id IN (SELECT get_user_org_ids(auth.uid()))
  ));

CREATE POLICY "Org members can update underwriting phase data"
  ON public.underwriting_phase_data FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.underwritings u
    WHERE u.id = underwriting_phase_data.underwriting_id
      AND u.org_id IN (SELECT get_user_org_ids(auth.uid()))
  ));

CREATE POLICY "Org members can delete underwriting phase data"
  ON public.underwriting_phase_data FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.underwritings u
    WHERE u.id = underwriting_phase_data.underwriting_id
      AND u.org_id IN (SELECT get_user_org_ids(auth.uid()))
  ));

-- Storage RLS: underwriting-docs bucket
CREATE POLICY "Org members can upload underwriting docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'underwriting-docs'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Org members can view underwriting docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'underwriting-docs'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Org members can delete underwriting docs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'underwriting-docs'
    AND auth.uid() IS NOT NULL
  );
