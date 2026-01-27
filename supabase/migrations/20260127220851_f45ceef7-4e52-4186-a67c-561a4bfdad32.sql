-- Drop the old constraint
ALTER TABLE public.transactions
DROP CONSTRAINT transactions_transaction_type_check;

-- Add updated constraint that includes 'Unknown/Removed'
ALTER TABLE public.transactions
ADD CONSTRAINT transactions_transaction_type_check 
CHECK (transaction_type = ANY (ARRAY['Sale'::text, 'Lease'::text, 'Sublease'::text, 'Unknown/Removed'::text]));