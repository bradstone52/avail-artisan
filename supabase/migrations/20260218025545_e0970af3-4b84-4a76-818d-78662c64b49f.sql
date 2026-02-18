
-- =============================================
-- MIGRATION 1: Security Hardening
-- =============================================

-- 1. LOCK DOWN google_oauth_tokens: Remove all client-side SELECT access
-- These tokens should ONLY be accessed server-side via service_role
DROP POLICY IF EXISTS "Users can view their own tokens" ON public.google_oauth_tokens;
DROP POLICY IF EXISTS "Users can manage their own tokens" ON public.google_oauth_tokens;
DROP POLICY IF EXISTS "Users can insert their own tokens" ON public.google_oauth_tokens;
DROP POLICY IF EXISTS "Users can update their own tokens" ON public.google_oauth_tokens;
DROP POLICY IF EXISTS "Users can delete their own tokens" ON public.google_oauth_tokens;
DROP POLICY IF EXISTS "Admins can view workspace tokens" ON public.google_oauth_tokens;

-- Only allow service_role (server-side) to access tokens
-- No client-side policies at all for this table
-- Edge functions use service_role key which bypasses RLS

-- 2. LOCK DOWN org_integrations: Remove SELECT of sensitive token columns from non-admins
-- We can't hide columns with RLS, so we restrict the entire table to admins only
DROP POLICY IF EXISTS "Org members can view their org integration" ON public.org_integrations;

-- Only org admins can read integrations (which contain tokens)
CREATE POLICY "Only org admins can view org integrations"
ON public.org_integrations
FOR SELECT
USING (is_org_admin(auth.uid(), org_id));

-- 3. FIX OVERLY PERMISSIVE RLS: distribution_batches -> org-scoped
-- Currently uses auth.uid() IS NOT NULL which is too broad
DROP POLICY IF EXISTS "Authenticated users can delete batches" ON public.distribution_batches;
DROP POLICY IF EXISTS "Authenticated users can insert batches" ON public.distribution_batches;
DROP POLICY IF EXISTS "Authenticated users can update batches" ON public.distribution_batches;
DROP POLICY IF EXISTS "Authenticated users can view batches" ON public.distribution_batches;

-- Add org_id column if not exists (distribution_batches doesn't have one currently)
-- We'll scope by created_by's org membership instead
CREATE POLICY "Org members can view batches"
ON public.distribution_batches
FOR SELECT
USING (auth.uid() IS NOT NULL AND (
  created_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM org_members om1 
    JOIN org_members om2 ON om1.org_id = om2.org_id
    WHERE om1.user_id = auth.uid() AND om2.user_id = distribution_batches.created_by
  )
));

CREATE POLICY "Org members can insert batches"
ON public.distribution_batches
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Org members can update batches"
ON public.distribution_batches
FOR UPDATE
USING (auth.uid() IS NOT NULL AND (
  created_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM org_members om1 
    JOIN org_members om2 ON om1.org_id = om2.org_id
    WHERE om1.user_id = auth.uid() AND om2.user_id = distribution_batches.created_by
  )
));

CREATE POLICY "Org members can delete batches"
ON public.distribution_batches
FOR DELETE
USING (auth.uid() IS NOT NULL AND (
  created_by = auth.uid() OR is_admin(auth.uid())
));

-- 4. FIX: distribution_recipient_batch_status -> scope through batch creator's org
DROP POLICY IF EXISTS "Authenticated users can delete batch status" ON public.distribution_recipient_batch_status;
DROP POLICY IF EXISTS "Authenticated users can insert batch status" ON public.distribution_recipient_batch_status;
DROP POLICY IF EXISTS "Authenticated users can update batch status" ON public.distribution_recipient_batch_status;
DROP POLICY IF EXISTS "Authenticated users can view batch status" ON public.distribution_recipient_batch_status;

CREATE POLICY "Org members can view batch status"
ON public.distribution_recipient_batch_status
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM distribution_batches db
  JOIN org_members om1 ON om1.user_id = db.created_by
  JOIN org_members om2 ON om2.org_id = om1.org_id AND om2.user_id = auth.uid()
  WHERE db.id = distribution_recipient_batch_status.batch_id
));

CREATE POLICY "Org members can insert batch status"
ON public.distribution_recipient_batch_status
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM distribution_batches db
  JOIN org_members om1 ON om1.user_id = db.created_by
  JOIN org_members om2 ON om2.org_id = om1.org_id AND om2.user_id = auth.uid()
  WHERE db.id = distribution_recipient_batch_status.batch_id
));

CREATE POLICY "Org members can update batch status"
ON public.distribution_recipient_batch_status
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM distribution_batches db
  JOIN org_members om1 ON om1.user_id = db.created_by
  JOIN org_members om2 ON om2.org_id = om1.org_id AND om2.user_id = auth.uid()
  WHERE db.id = distribution_recipient_batch_status.batch_id
));

CREATE POLICY "Org members can delete batch status"
ON public.distribution_recipient_batch_status
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM distribution_batches db
  JOIN org_members om1 ON om1.user_id = db.created_by
  JOIN org_members om2 ON om2.org_id = om1.org_id AND om2.user_id = auth.uid()
  WHERE db.id = distribution_recipient_batch_status.batch_id
));

-- 5. FIX: property_permits -> scope through property creator's org
DROP POLICY IF EXISTS "Authenticated users can delete property permits" ON public.property_permits;
DROP POLICY IF EXISTS "Authenticated users can insert property permits" ON public.property_permits;
DROP POLICY IF EXISTS "Authenticated users can update property permits" ON public.property_permits;
DROP POLICY IF EXISTS "Authenticated users can view property permits" ON public.property_permits;

CREATE POLICY "Users can view property permits"
ON public.property_permits
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM properties p WHERE p.id = property_permits.property_id AND p.created_by = auth.uid()
));

CREATE POLICY "Users can insert property permits"
ON public.property_permits
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM properties p WHERE p.id = property_permits.property_id AND p.created_by = auth.uid()
));

CREATE POLICY "Users can update property permits"
ON public.property_permits
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM properties p WHERE p.id = property_permits.property_id AND p.created_by = auth.uid()
));

CREATE POLICY "Users can delete property permits"
ON public.property_permits
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM properties p WHERE p.id = property_permits.property_id AND p.created_by = auth.uid()
));

-- 6. FIX: pdf_import_staging -> scope to creator only
DROP POLICY IF EXISTS "Authenticated users can delete staging records" ON public.pdf_import_staging;
DROP POLICY IF EXISTS "Authenticated users can insert staging records" ON public.pdf_import_staging;
DROP POLICY IF EXISTS "Authenticated users can update staging records" ON public.pdf_import_staging;
DROP POLICY IF EXISTS "Authenticated users can view staging records" ON public.pdf_import_staging;

CREATE POLICY "Users can view their staging records"
ON public.pdf_import_staging
FOR SELECT
USING (created_by = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can insert staging records"
ON public.pdf_import_staging
FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their staging records"
ON public.pdf_import_staging
FOR UPDATE
USING (created_by = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can delete their staging records"
ON public.pdf_import_staging
FOR DELETE
USING (created_by = auth.uid() OR is_admin(auth.uid()));

-- 7. RESTRICT DEALS: Only admins + deal creator + assigned agents can access
-- First create a helper function to check deal access
CREATE OR REPLACE FUNCTION public.has_deal_access(_user_id uuid, _deal_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM deals d
    WHERE d.id = _deal_id
    AND (
      -- Admin always has access
      is_admin(_user_id)
      -- Deal creator
      OR d.user_id = _user_id
      -- CV agent assigned to the deal
      OR d.cv_agent_id IN (SELECT id FROM agents WHERE user_id = _user_id)
      -- Listing/selling agents (if they're linked to user accounts via agents table)
      OR d.listing_agent1_id IN (SELECT id FROM agents WHERE user_id = _user_id)
      OR d.listing_agent2_id IN (SELECT id FROM agents WHERE user_id = _user_id)
      OR d.selling_agent1_id IN (SELECT id FROM agents WHERE user_id = _user_id)
      OR d.selling_agent2_id IN (SELECT id FROM agents WHERE user_id = _user_id)
    )
  )
$$;

-- Helper for deal access by org + role check at deal level
CREATE OR REPLACE FUNCTION public.can_access_deal(_user_id uuid, _deal_org_id uuid, _deal_user_id uuid, _deal_cv_agent_id uuid, _deal_la1 uuid, _deal_la2 uuid, _deal_sa1 uuid, _deal_sa2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Must be in the same org
    is_org_member(_user_id, _deal_org_id)
    AND (
      -- Admin always sees all org deals
      is_admin(_user_id)
      -- Deal creator
      OR _deal_user_id = _user_id
      -- Any assigned agent linked to this user
      OR EXISTS (
        SELECT 1 FROM agents a WHERE a.user_id = _user_id AND a.id IN (
          _deal_cv_agent_id, _deal_la1, _deal_la2, _deal_sa1, _deal_sa2
        )
      )
    )
$$;

-- Replace deals RLS policies
DROP POLICY IF EXISTS "Org members can delete deals" ON public.deals;
DROP POLICY IF EXISTS "Org members can insert deals" ON public.deals;
DROP POLICY IF EXISTS "Org members can update deals" ON public.deals;
DROP POLICY IF EXISTS "Org members can view deals" ON public.deals;

CREATE POLICY "Authorized users can view deals"
ON public.deals
FOR SELECT
USING (
  org_id IN (SELECT get_user_org_ids(auth.uid()))
  AND (
    is_admin(auth.uid())
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM agents a WHERE a.user_id = auth.uid() AND a.id IN (
        cv_agent_id, listing_agent1_id, listing_agent2_id, selling_agent1_id, selling_agent2_id
      )
    )
  )
);

CREATE POLICY "Authorized users can insert deals"
ON public.deals
FOR INSERT
WITH CHECK (
  org_id IN (SELECT get_user_org_ids(auth.uid()))
  AND user_id = auth.uid()
);

CREATE POLICY "Authorized users can update deals"
ON public.deals
FOR UPDATE
USING (
  org_id IN (SELECT get_user_org_ids(auth.uid()))
  AND (
    is_admin(auth.uid())
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM agents a WHERE a.user_id = auth.uid() AND a.id IN (
        cv_agent_id, listing_agent1_id, listing_agent2_id, selling_agent1_id, selling_agent2_id
      )
    )
  )
);

CREATE POLICY "Authorized users can delete deals"
ON public.deals
FOR DELETE
USING (
  org_id IN (SELECT get_user_org_ids(auth.uid()))
  AND (is_admin(auth.uid()) OR user_id = auth.uid())
);

-- 8. Update deal sub-tables to use has_deal_access function
-- deal_conditions
DROP POLICY IF EXISTS "Users can delete deal conditions in their org" ON public.deal_conditions;
DROP POLICY IF EXISTS "Users can insert deal conditions in their org" ON public.deal_conditions;
DROP POLICY IF EXISTS "Users can update deal conditions in their org" ON public.deal_conditions;
DROP POLICY IF EXISTS "Users can view deal conditions in their org" ON public.deal_conditions;

CREATE POLICY "Authorized users can view deal conditions"
ON public.deal_conditions FOR SELECT
USING (has_deal_access(auth.uid(), deal_id));

CREATE POLICY "Authorized users can insert deal conditions"
ON public.deal_conditions FOR INSERT
WITH CHECK (has_deal_access(auth.uid(), deal_id));

CREATE POLICY "Authorized users can update deal conditions"
ON public.deal_conditions FOR UPDATE
USING (has_deal_access(auth.uid(), deal_id));

CREATE POLICY "Authorized users can delete deal conditions"
ON public.deal_conditions FOR DELETE
USING (has_deal_access(auth.uid(), deal_id));

-- deal_deposits
DROP POLICY IF EXISTS "Users can delete deal deposits in their org" ON public.deal_deposits;
DROP POLICY IF EXISTS "Users can insert deal deposits in their org" ON public.deal_deposits;
DROP POLICY IF EXISTS "Users can update deal deposits in their org" ON public.deal_deposits;
DROP POLICY IF EXISTS "Users can view deal deposits in their org" ON public.deal_deposits;

CREATE POLICY "Authorized users can view deal deposits"
ON public.deal_deposits FOR SELECT
USING (has_deal_access(auth.uid(), deal_id));

CREATE POLICY "Authorized users can insert deal deposits"
ON public.deal_deposits FOR INSERT
WITH CHECK (has_deal_access(auth.uid(), deal_id));

CREATE POLICY "Authorized users can update deal deposits"
ON public.deal_deposits FOR UPDATE
USING (has_deal_access(auth.uid(), deal_id));

CREATE POLICY "Authorized users can delete deal deposits"
ON public.deal_deposits FOR DELETE
USING (has_deal_access(auth.uid(), deal_id));

-- deal_documents
DROP POLICY IF EXISTS "Users can delete deal documents in their org" ON public.deal_documents;
DROP POLICY IF EXISTS "Users can insert deal documents in their org" ON public.deal_documents;
DROP POLICY IF EXISTS "Users can view deal documents in their org" ON public.deal_documents;

CREATE POLICY "Authorized users can view deal documents"
ON public.deal_documents FOR SELECT
USING (has_deal_access(auth.uid(), deal_id));

CREATE POLICY "Authorized users can insert deal documents"
ON public.deal_documents FOR INSERT
WITH CHECK (has_deal_access(auth.uid(), deal_id));

CREATE POLICY "Authorized users can delete deal documents"
ON public.deal_documents FOR DELETE
USING (has_deal_access(auth.uid(), deal_id));

-- deal_important_dates
DROP POLICY IF EXISTS "Users can delete deal important dates" ON public.deal_important_dates;
DROP POLICY IF EXISTS "Users can insert deal important dates" ON public.deal_important_dates;
DROP POLICY IF EXISTS "Users can update deal important dates" ON public.deal_important_dates;
DROP POLICY IF EXISTS "Users can view deal important dates" ON public.deal_important_dates;

CREATE POLICY "Authorized users can view deal important dates"
ON public.deal_important_dates FOR SELECT
USING (has_deal_access(auth.uid(), deal_id));

CREATE POLICY "Authorized users can insert deal important dates"
ON public.deal_important_dates FOR INSERT
WITH CHECK (has_deal_access(auth.uid(), deal_id));

CREATE POLICY "Authorized users can update deal important dates"
ON public.deal_important_dates FOR UPDATE
USING (has_deal_access(auth.uid(), deal_id));

CREATE POLICY "Authorized users can delete deal important dates"
ON public.deal_important_dates FOR DELETE
USING (has_deal_access(auth.uid(), deal_id));

-- deal_summary_actions
DROP POLICY IF EXISTS "Users can delete deal summary actions in their org" ON public.deal_summary_actions;
DROP POLICY IF EXISTS "Users can insert deal summary actions in their org" ON public.deal_summary_actions;
DROP POLICY IF EXISTS "Users can update deal summary actions in their org" ON public.deal_summary_actions;
DROP POLICY IF EXISTS "Users can view deal summary actions in their org" ON public.deal_summary_actions;

CREATE POLICY "Authorized users can view deal summary actions"
ON public.deal_summary_actions FOR SELECT
USING (has_deal_access(auth.uid(), deal_id));

CREATE POLICY "Authorized users can insert deal summary actions"
ON public.deal_summary_actions FOR INSERT
WITH CHECK (has_deal_access(auth.uid(), deal_id));

CREATE POLICY "Authorized users can update deal summary actions"
ON public.deal_summary_actions FOR UPDATE
USING (has_deal_access(auth.uid(), deal_id));

CREATE POLICY "Authorized users can delete deal summary actions"
ON public.deal_summary_actions FOR DELETE
USING (has_deal_access(auth.uid(), deal_id));

-- 9. Create backup storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('data-backups', 'data-backups', false)
ON CONFLICT (id) DO NOTHING;

-- Only admins can access backups
CREATE POLICY "Admins can manage backups"
ON storage.objects
FOR ALL
USING (bucket_id = 'data-backups' AND is_admin(auth.uid()))
WITH CHECK (bucket_id = 'data-backups' AND is_admin(auth.uid()));
