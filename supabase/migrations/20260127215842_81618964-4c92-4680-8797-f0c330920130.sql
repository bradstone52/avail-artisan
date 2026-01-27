-- Add property_id column to transactions table
ALTER TABLE public.transactions
ADD COLUMN property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL;

-- Create index for efficient property lookups
CREATE INDEX idx_transactions_property_id ON public.transactions(property_id);

-- Backfill existing transactions by matching addresses
UPDATE public.transactions t
SET property_id = p.id
FROM public.properties p
WHERE LOWER(TRIM(t.address)) = LOWER(TRIM(p.address))
  AND t.property_id IS NULL;