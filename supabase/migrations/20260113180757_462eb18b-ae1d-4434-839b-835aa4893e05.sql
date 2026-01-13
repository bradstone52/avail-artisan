-- Create an enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable Row-Level Security on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create a Security Definer Function to check roles (bypasses RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- RLS policies for user_roles
-- Admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Admins can insert roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Admins can delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create workspace_settings table for app-level settings (like Google connection)
CREATE TABLE public.workspace_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text NOT NULL UNIQUE,
    value jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on workspace_settings
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view workspace settings
CREATE POLICY "Authenticated users can view workspace settings"
ON public.workspace_settings
FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify workspace settings
CREATE POLICY "Admins can manage workspace settings"
ON public.workspace_settings
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Add an admin_user_id column to google_oauth_tokens to track who connected it (optional)
-- But tokens will now be accessible to all admins for syncing
ALTER TABLE public.google_oauth_tokens 
ADD COLUMN IF NOT EXISTS is_workspace_token boolean DEFAULT false;

-- Update google_oauth_tokens RLS to allow admins to read workspace tokens
DROP POLICY IF EXISTS "Users can view their own tokens" ON public.google_oauth_tokens;
CREATE POLICY "Users and admins can view tokens"
ON public.google_oauth_tokens
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR (is_workspace_token = true AND public.is_admin(auth.uid()))
);

-- Add is_workspace_connection column to sheet_connections
ALTER TABLE public.sheet_connections
ADD COLUMN IF NOT EXISTS is_workspace_connection boolean DEFAULT false;

-- Update sheet_connections RLS to allow all authenticated users to view workspace connections
DROP POLICY IF EXISTS "Users can manage their own sheet connections" ON public.sheet_connections;

CREATE POLICY "Users can view workspace connections"
ON public.sheet_connections
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR is_workspace_connection = true
);

CREATE POLICY "Admins can manage workspace connections"
ON public.sheet_connections
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users can manage their own connections"
ON public.sheet_connections
FOR ALL
TO authenticated
USING (auth.uid() = user_id AND is_workspace_connection = false)
WITH CHECK (auth.uid() = user_id AND is_workspace_connection = false);

-- Make the first user (Brad Stone) an admin automatically using their existing profile
-- We'll set this up via a function that can be called
CREATE OR REPLACE FUNCTION public.make_first_user_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    first_user_id uuid;
BEGIN
    -- Get the first user who signed up
    SELECT id INTO first_user_id
    FROM auth.users
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (first_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END;
$$;

-- Execute to make first user admin
SELECT public.make_first_user_admin();