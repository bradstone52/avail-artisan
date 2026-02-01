-- Drop existing org member policies that may have incorrect conditions
DROP POLICY IF EXISTS "Org members can view brokerages" ON public.brokerages;
DROP POLICY IF EXISTS "Org members can insert brokerages" ON public.brokerages;
DROP POLICY IF EXISTS "Org members can update brokerages" ON public.brokerages;
DROP POLICY IF EXISTS "Org members can delete brokerages" ON public.brokerages;

-- Recreate with proper org-scoped conditions
CREATE POLICY "Org members can view brokerages"
ON public.brokerages
FOR SELECT
USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can insert brokerages"
ON public.brokerages
FOR INSERT
WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can update brokerages"
ON public.brokerages
FOR UPDATE
USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can delete brokerages"
ON public.brokerages
FOR DELETE
USING (org_id IN (SELECT get_user_org_ids(auth.uid())));