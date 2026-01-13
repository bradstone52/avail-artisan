-- Create orgs table
CREATE TABLE public.orgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on orgs
ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;

-- Create org_members table
CREATE TABLE public.org_members (
  org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

-- Enable RLS on org_members
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- Add org_id to listings table
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.orgs(id);

-- Create security definer function to get user's org_ids
CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.org_members WHERE user_id = _user_id
$$;

-- Create security definer function to check org membership
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members 
    WHERE user_id = _user_id AND org_id = _org_id
  )
$$;

-- Create function to ensure user has an org (called on login)
CREATE OR REPLACE FUNCTION public.ensure_user_org(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_org_id uuid;
  new_org_id uuid;
BEGIN
  -- Check if user already has an org
  SELECT org_id INTO existing_org_id
  FROM public.org_members
  WHERE user_id = _user_id
  LIMIT 1;
  
  IF existing_org_id IS NOT NULL THEN
    RETURN existing_org_id;
  END IF;
  
  -- Create new org "ClearView" and add user as admin
  INSERT INTO public.orgs (name)
  VALUES ('ClearView')
  RETURNING id INTO new_org_id;
  
  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES (new_org_id, _user_id, 'admin');
  
  -- Backfill any existing listings for this user to the new org
  UPDATE public.listings
  SET org_id = new_org_id
  WHERE user_id = _user_id AND org_id IS NULL;
  
  RETURN new_org_id;
END;
$$;

-- RLS Policies for org_members
CREATE POLICY "Users can view their own org memberships"
  ON public.org_members FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Org admins can manage members"
  ON public.org_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_members.org_id
        AND om.user_id = auth.uid()
        AND om.role = 'admin'
    )
  );

-- RLS Policies for orgs
CREATE POLICY "Users can view their orgs"
  ON public.orgs FOR SELECT
  USING (
    id IN (SELECT public.get_user_org_ids(auth.uid()))
  );

CREATE POLICY "Org admins can update their orgs"
  ON public.orgs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = orgs.id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- Update listings RLS policies
DROP POLICY IF EXISTS "Users can manage their own listings" ON public.listings;

CREATE POLICY "Org members can view org listings"
  ON public.listings FOR SELECT
  USING (
    org_id IN (SELECT public.get_user_org_ids(auth.uid()))
  );

CREATE POLICY "Org members can insert listings"
  ON public.listings FOR INSERT
  WITH CHECK (
    org_id IN (SELECT public.get_user_org_ids(auth.uid()))
  );

CREATE POLICY "Org members can update org listings"
  ON public.listings FOR UPDATE
  USING (
    org_id IN (SELECT public.get_user_org_ids(auth.uid()))
  );

CREATE POLICY "Org members can delete org listings"
  ON public.listings FOR DELETE
  USING (
    org_id IN (SELECT public.get_user_org_ids(auth.uid()))
  );