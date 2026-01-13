-- Create security definer function to check org admin status
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = _user_id 
      AND org_id = _org_id 
      AND role = 'admin'
  )
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Org admins can manage members" ON public.org_members;

-- Recreate with security definer function
CREATE POLICY "Org admins can manage members"
ON public.org_members
FOR ALL
USING (public.is_org_admin(auth.uid(), org_id))
WITH CHECK (public.is_org_admin(auth.uid(), org_id));