-- Fix distribution_batches RLS policies to require authentication
DROP POLICY IF EXISTS "Authenticated users can view batches" ON public.distribution_batches;
DROP POLICY IF EXISTS "Authenticated users can insert batches" ON public.distribution_batches;
DROP POLICY IF EXISTS "Authenticated users can update batches" ON public.distribution_batches;
DROP POLICY IF EXISTS "Authenticated users can delete batches" ON public.distribution_batches;

CREATE POLICY "Authenticated users can view batches"
ON public.distribution_batches
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert batches"
ON public.distribution_batches
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update batches"
ON public.distribution_batches
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete batches"
ON public.distribution_batches
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Fix distribution_recipient_batch_status RLS policies to require authentication
DROP POLICY IF EXISTS "Authenticated users can view batch status" ON public.distribution_recipient_batch_status;
DROP POLICY IF EXISTS "Authenticated users can insert batch status" ON public.distribution_recipient_batch_status;
DROP POLICY IF EXISTS "Authenticated users can update batch status" ON public.distribution_recipient_batch_status;
DROP POLICY IF EXISTS "Authenticated users can delete batch status" ON public.distribution_recipient_batch_status;

CREATE POLICY "Authenticated users can view batch status"
ON public.distribution_recipient_batch_status
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert batch status"
ON public.distribution_recipient_batch_status
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update batch status"
ON public.distribution_recipient_batch_status
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete batch status"
ON public.distribution_recipient_batch_status
FOR DELETE
USING (auth.uid() IS NOT NULL);