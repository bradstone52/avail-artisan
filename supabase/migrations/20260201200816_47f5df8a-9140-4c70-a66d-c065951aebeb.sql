-- Fix distribution_recipients RLS policies to require authentication
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Org members can view recipients" ON public.distribution_recipients;
DROP POLICY IF EXISTS "Org members can insert recipients" ON public.distribution_recipients;
DROP POLICY IF EXISTS "Org members can update recipients" ON public.distribution_recipients;
DROP POLICY IF EXISTS "Org members can delete recipients" ON public.distribution_recipients;

-- Create new policies that require authentication
CREATE POLICY "Authenticated users can view recipients"
ON public.distribution_recipients
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert recipients"
ON public.distribution_recipients
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update recipients"
ON public.distribution_recipients
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete recipients"
ON public.distribution_recipients
FOR DELETE
USING (auth.uid() IS NOT NULL);