BEGIN;

-- Mark migrated lease_comps with full lease data as tracked.
-- Intent: these came from the original transactions table via
-- migration 20260423000001 and represent active client lease tracking
-- (vs reference comps). This UPDATE was originally run interactively
-- as part of Phase 3 work; this migration captures it for audit and
-- replay.
-- Idempotent: re-running has no effect on rows already is_tracked=true.

UPDATE public.lease_comps
SET is_tracked = true
WHERE tenant_name IS NOT NULL
  AND term_months IS NOT NULL
  AND commencement_date IS NOT NULL
  AND is_tracked = false;

DO $$
DECLARE
  v_tracked integer;
BEGIN
  SELECT COUNT(*) INTO v_tracked FROM public.lease_comps WHERE is_tracked = true;
  RAISE NOTICE 'lease_comps with is_tracked=true: %', v_tracked;
END $$;

COMMIT;
