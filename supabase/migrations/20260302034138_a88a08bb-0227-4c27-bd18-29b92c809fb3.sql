ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS internal_listing_id UUID
    REFERENCES public.internal_listings(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deals_internal_listing_id
  ON public.deals(internal_listing_id);