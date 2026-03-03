
-- Part 1: Widen deals SELECT policy so all org members can view
DROP POLICY IF EXISTS "Authorized users can view deals" ON public.deals;
DROP POLICY IF EXISTS "Org members can view deals" ON public.deals;

CREATE POLICY "Org members can view deals"
  ON public.deals
  FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- Part 2: Add assigned_to column to prospect_tasks
ALTER TABLE public.prospect_tasks
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;
