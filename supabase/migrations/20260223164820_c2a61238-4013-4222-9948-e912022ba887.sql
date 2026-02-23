
-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can add tenants to their properties" ON property_tenants;

-- Create broader policy allowing any org member to insert tenants
CREATE POLICY "Org members can add tenants to org properties"
  ON property_tenants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN org_members om1 ON om1.user_id = p.created_by
      JOIN org_members om2 ON om2.org_id = om1.org_id
      WHERE p.id = property_tenants.property_id
        AND om2.user_id = auth.uid()
    )
  );
