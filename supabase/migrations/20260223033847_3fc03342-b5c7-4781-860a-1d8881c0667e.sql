
-- Add lawyer fields and nomenclature toggle to deals table
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS seller_lawyer_name text,
  ADD COLUMN IF NOT EXISTS seller_lawyer_firm text,
  ADD COLUMN IF NOT EXISTS seller_lawyer_phone text,
  ADD COLUMN IF NOT EXISTS seller_lawyer_email text,
  ADD COLUMN IF NOT EXISTS buyer_lawyer_name text,
  ADD COLUMN IF NOT EXISTS buyer_lawyer_firm text,
  ADD COLUMN IF NOT EXISTS buyer_lawyer_phone text,
  ADD COLUMN IF NOT EXISTS buyer_lawyer_email text,
  ADD COLUMN IF NOT EXISTS use_purchaser_vendor boolean NOT NULL DEFAULT false;
