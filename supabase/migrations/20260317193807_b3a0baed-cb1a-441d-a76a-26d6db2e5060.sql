
-- brochure_states: persists brochure editor state per listing
CREATE TABLE public.brochure_states (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    uuid NOT NULL REFERENCES public.internal_listings(id) ON DELETE CASCADE,
  template_key  text NOT NULL DEFAULT 'industrial-standard',
  marketing_json jsonb,
  overrides_json jsonb NOT NULL DEFAULT '{}',
  hero_photo_id  text,
  hero_photo_url text,
  gallery_photo_ids jsonb NOT NULL DEFAULT '[]',
  include_confidential boolean NOT NULL DEFAULT false,
  map_zoom       integer NOT NULL DEFAULT 14,
  map_offset_lat double precision NOT NULL DEFAULT 0,
  map_offset_lng double precision NOT NULL DEFAULT 0,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  updated_by     uuid,
  UNIQUE(listing_id)
);

CREATE TRIGGER update_brochure_states_updated_at
  BEFORE UPDATE ON public.brochure_states
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.brochure_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view brochure states"
  ON public.brochure_states FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.internal_listings il
      JOIN public.org_members om ON om.org_id = il.org_id
      WHERE il.id = brochure_states.listing_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can insert brochure states"
  ON public.brochure_states FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.internal_listings il
      JOIN public.org_members om ON om.org_id = il.org_id
      WHERE il.id = listing_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can update brochure states"
  ON public.brochure_states FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.internal_listings il
      JOIN public.org_members om ON om.org_id = il.org_id
      WHERE il.id = brochure_states.listing_id
        AND om.user_id = auth.uid()
    )
  );

CREATE INDEX idx_brochure_states_listing_id ON public.brochure_states(listing_id);
