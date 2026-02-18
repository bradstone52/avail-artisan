
-- 1. Revert property_permits back to any authenticated user
DROP POLICY IF EXISTS "Users can view property permits" ON public.property_permits;
DROP POLICY IF EXISTS "Users can insert property permits" ON public.property_permits;
DROP POLICY IF EXISTS "Users can update property permits" ON public.property_permits;
DROP POLICY IF EXISTS "Users can delete property permits" ON public.property_permits;

CREATE POLICY "Authenticated users can view property permits"
ON public.property_permits FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert property permits"
ON public.property_permits FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update property permits"
ON public.property_permits FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete property permits"
ON public.property_permits FOR DELETE
USING (auth.uid() IS NOT NULL);

-- 2. Revert pdf_import_staging back to any authenticated user
DROP POLICY IF EXISTS "Users can view their staging records" ON public.pdf_import_staging;
DROP POLICY IF EXISTS "Users can insert staging records" ON public.pdf_import_staging;
DROP POLICY IF EXISTS "Users can update their staging records" ON public.pdf_import_staging;
DROP POLICY IF EXISTS "Users can delete their staging records" ON public.pdf_import_staging;

CREATE POLICY "Authenticated users can view staging records"
ON public.pdf_import_staging FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert staging records"
ON public.pdf_import_staging FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update staging records"
ON public.pdf_import_staging FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete staging records"
ON public.pdf_import_staging FOR DELETE
USING (auth.uid() IS NOT NULL);

-- 3. Enable pg_cron and pg_net for scheduled backups
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
