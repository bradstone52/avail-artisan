-- Add invite_code column to orgs
ALTER TABLE public.orgs 
ADD COLUMN IF NOT EXISTS invite_code text UNIQUE;

-- Create function to generate random invite code
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE sql
AS $$
  SELECT upper(substring(md5(random()::text) from 1 for 8))
$$;

-- Backfill existing orgs with invite codes
UPDATE public.orgs 
SET invite_code = public.generate_invite_code()
WHERE invite_code IS NULL;

-- Make invite_code NOT NULL after backfill
ALTER TABLE public.orgs 
ALTER COLUMN invite_code SET NOT NULL;

-- Set default for new orgs
ALTER TABLE public.orgs 
ALTER COLUMN invite_code SET DEFAULT public.generate_invite_code();

-- Update ensure_user_org function to include invite_code
CREATE OR REPLACE FUNCTION public.ensure_user_org(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Create new org "ClearView" with invite code
  INSERT INTO public.orgs (name, invite_code)
  VALUES ('ClearView', public.generate_invite_code())
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