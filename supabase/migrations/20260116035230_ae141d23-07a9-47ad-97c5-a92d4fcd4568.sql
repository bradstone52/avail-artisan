-- Add RLS policy for admins to view all profiles in their org
CREATE POLICY "Admins can view org member profiles"
ON public.profiles
FOR SELECT
USING (
  -- User is an admin and the profile belongs to someone in one of their orgs
  is_admin(auth.uid()) AND
  id IN (
    SELECT om.user_id 
    FROM org_members om 
    WHERE om.org_id IN (SELECT get_user_org_ids(auth.uid()))
  )
);