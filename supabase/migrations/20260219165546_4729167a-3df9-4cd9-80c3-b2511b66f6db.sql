ALTER TABLE public.pdf_import_staging
  DROP CONSTRAINT pdf_import_staging_matched_listing_id_fkey,
  ADD CONSTRAINT pdf_import_staging_matched_listing_id_fkey
    FOREIGN KEY (matched_listing_id)
    REFERENCES public.market_listings(id)
    ON DELETE SET NULL;