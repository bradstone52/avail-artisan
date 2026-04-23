BEGIN;

-- ============================================================
-- Phase 1: Create lease_comps table + transactions_archive,
--          migrate data from transactions.
--          transactions table is NOT dropped here (safety net).
-- ============================================================


-- ── 1. lease_comps ───────────────────────────────────────────

CREATE TABLE public.lease_comps (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid        REFERENCES public.orgs(id) ON DELETE CASCADE,
  address           text        NOT NULL,
  property_id       uuid        REFERENCES public.properties(id) ON DELETE SET NULL,
  submarket         text,
  size_sf           integer,
  net_rate_psf      numeric,
  op_costs_psf      numeric,
  term_months       integer,
  commencement_date date,
  fixturing_months  integer,
  tenant_name       text,
  landlord_name     text,
  source            text,
  is_tracked        boolean     NOT NULL DEFAULT false,
  notes             text,
  created_by        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_lease_comps_updated_at
  BEFORE UPDATE ON public.lease_comps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_lease_comps_org_id       ON public.lease_comps(org_id);
CREATE INDEX idx_lease_comps_property_id  ON public.lease_comps(property_id);
CREATE INDEX idx_lease_comps_commencement ON public.lease_comps(commencement_date DESC);
CREATE INDEX idx_lease_comps_submarket    ON public.lease_comps(submarket);

ALTER TABLE public.lease_comps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view lease_comps"
  ON public.lease_comps FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can insert lease_comps"
  ON public.lease_comps FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can update lease_comps"
  ON public.lease_comps FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can delete lease_comps"
  ON public.lease_comps FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));


-- ── 2. transactions_archive ──────────────────────────────────
-- Exact column copy of transactions; RLS disabled (internal only).

CREATE TABLE public.transactions_archive (LIKE public.transactions INCLUDING ALL);

ALTER TABLE public.transactions_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view transactions_archive"
  ON public.transactions_archive FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));


-- ── 3. Data migration ─────────────────────────────────────────

-- 3a. Archive Sale + Sublease rows (preserve originals)
INSERT INTO public.transactions_archive
SELECT * FROM public.transactions
WHERE transaction_type IN ('Sale', 'Sublease');

-- 3b. Migrate Lease + Renewal rows into lease_comps
INSERT INTO public.lease_comps (
  org_id,
  address,
  property_id,
  submarket,
  size_sf,
  net_rate_psf,
  op_costs_psf,
  term_months,
  commencement_date,
  fixturing_months,
  tenant_name,
  landlord_name,
  source,
  is_tracked,
  notes,
  created_by,
  created_at,
  updated_at
)
SELECT
  org_id,
  address,
  property_id,
  NULLIF(TRIM(submarket), ''),                         -- empty strings → NULL
  size_sf,
  COALESCE(year1_lease_rate_psf, lease_rate_psf),      -- year1 preferred; fall back to blended
  est_op_costs_psf,
  lease_term_months,
  transaction_date,
  months_gross_fixturing,
  buyer_tenant_company,                                 -- this is the populated field (26 rows)
  seller_landlord_company,
  'Migrated from transactions',
  false,
  notes,
  created_by,
  created_at,
  updated_at
FROM public.transactions
WHERE transaction_type IN ('Lease', 'Renewal');


-- ── 4. Verification counts ────────────────────────────────────
-- These will appear in the migration output; review before proceeding.

DO $$
DECLARE
  v_lease_comps        integer;
  v_archive            integer;
  v_unknown_removed    integer;
  v_source_lease       integer;
  v_source_renewal     integer;
BEGIN
  SELECT COUNT(*) INTO v_lease_comps        FROM public.lease_comps;
  SELECT COUNT(*) INTO v_archive            FROM public.transactions_archive;
  SELECT COUNT(*) INTO v_unknown_removed    FROM public.transactions WHERE transaction_type = 'Unknown/Removed';
  SELECT COUNT(*) INTO v_source_lease       FROM public.transactions WHERE transaction_type = 'Lease';
  SELECT COUNT(*) INTO v_source_renewal     FROM public.transactions WHERE transaction_type = 'Renewal';

  RAISE NOTICE '=== Migration verification ===';
  RAISE NOTICE 'lease_comps rows inserted:        % (expected 44 = 40 Lease + 4 Renewal)', v_lease_comps;
  RAISE NOTICE 'transactions_archive rows:        % (expected 19 = 13 Sale + 6 Sublease)', v_archive;
  RAISE NOTICE 'transactions.Lease rows (source): %', v_source_lease;
  RAISE NOTICE 'transactions.Renewal rows (src):  %', v_source_renewal;
  RAISE NOTICE 'transactions.Unknown/Removed:     % (will be deleted in Phase 4)', v_unknown_removed;
  RAISE NOTICE '=== transactions table untouched — safety net intact ===';

  IF v_lease_comps <> 44 THEN
    RAISE EXCEPTION 'lease_comps count mismatch: got %, expected 44', v_lease_comps;
  END IF;
  IF v_archive <> 19 THEN
    RAISE EXCEPTION 'transactions_archive count mismatch: got %, expected 19', v_archive;
  END IF;
END $$;

COMMIT;
