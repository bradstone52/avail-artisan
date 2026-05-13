BEGIN;

DO $$
DECLARE
  v_count_before integer;
BEGIN
  SELECT COUNT(*) INTO v_count_before FROM public.prospect_tasks;
  RAISE NOTICE 'prospect_tasks row count BEFORE alter: %', v_count_before;
END $$;

ALTER TABLE public.prospect_tasks
  ADD COLUMN skip_reminder boolean NOT NULL DEFAULT false;

DO $$
DECLARE
  v_count_after integer;
BEGIN
  SELECT COUNT(*) INTO v_count_after FROM public.prospect_tasks;
  RAISE NOTICE 'prospect_tasks row count AFTER alter: %', v_count_after;
END $$;

COMMIT;
