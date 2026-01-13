-- Fix search_path for generate_invite_code function
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT upper(substring(md5(random()::text) from 1 for 8))
$$;