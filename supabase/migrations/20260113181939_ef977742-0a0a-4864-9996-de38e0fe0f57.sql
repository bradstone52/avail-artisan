-- Create function to check if user is sync_operator
CREATE OR REPLACE FUNCTION public.is_sync_operator(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'sync_operator')
$$;

-- Create function to check if user can run sync (admin OR sync_operator)
CREATE OR REPLACE FUNCTION public.can_run_sync(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin(_user_id) OR public.is_sync_operator(_user_id)
$$;