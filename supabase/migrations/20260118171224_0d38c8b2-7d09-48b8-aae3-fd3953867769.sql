-- Add default_owner column to distribution_recipients
ALTER TABLE public.distribution_recipients ADD COLUMN IF NOT EXISTS default_owner text DEFAULT 'Unassigned';

-- Add status column to distribution_batches (replacing is_active with status enum-like text)
ALTER TABLE public.distribution_batches ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active';

-- Migrate is_active to status
UPDATE public.distribution_batches SET status = CASE WHEN is_active = true THEN 'Active' ELSE 'Closed' END WHERE status IS NULL OR status = 'Active';

-- Add owner column to batch_recipients (replacing owner_user_id with simple text)
ALTER TABLE public.distribution_recipient_batch_status ADD COLUMN IF NOT EXISTS owner text DEFAULT 'Unassigned';

-- Drop NOT NULL constraint on period_year and period_month since we're using name-based batches now
DO $$ 
BEGIN
    -- Make period_year nullable
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'distribution_batches' AND column_name = 'period_year' AND is_nullable = 'NO') THEN
        ALTER TABLE public.distribution_batches ALTER COLUMN period_year DROP NOT NULL;
    END IF;
    
    -- Make period_month nullable  
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'distribution_batches' AND column_name = 'period_month' AND is_nullable = 'NO') THEN
        ALTER TABLE public.distribution_batches ALTER COLUMN period_month DROP NOT NULL;
    END IF;
END $$;

-- Ensure RLS allows DELETE on distribution_recipient_batch_status for authenticated users
DROP POLICY IF EXISTS "Authenticated users can delete batch status" ON public.distribution_recipient_batch_status;
CREATE POLICY "Authenticated users can delete batch status" 
ON public.distribution_recipient_batch_status 
FOR DELETE 
TO authenticated 
USING (true);

-- Add delete policy for distribution_batches
DROP POLICY IF EXISTS "Authenticated users can delete batches" ON public.distribution_batches;
CREATE POLICY "Authenticated users can delete batches" 
ON public.distribution_batches 
FOR DELETE 
TO authenticated 
USING (true);