BEGIN;

-- Verify lease_comps and transactions_archive are populated before
-- dropping the source table.
DO $$
DECLARE
  v_lease_comps integer;
  v_archive integer;
BEGIN
  SELECT COUNT(*) INTO v_lease_comps FROM public.lease_comps;
  SELECT COUNT(*) INTO v_archive FROM public.transactions_archive;

  IF v_lease_comps < 44 THEN
    RAISE EXCEPTION 'lease_comps has % rows, expected at least 44 — aborting drop', v_lease_comps;
  END IF;
  IF v_archive < 19 THEN
    RAISE EXCEPTION 'transactions_archive has % rows, expected at least 19 — aborting drop', v_archive;
  END IF;

  RAISE NOTICE 'Pre-drop verification passed: lease_comps=%, archive=%', v_lease_comps, v_archive;
END $$;

-- Now safe to drop
DROP TABLE public.transactions CASCADE;

COMMIT;
