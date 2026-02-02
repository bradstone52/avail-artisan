-- Drop the existing constraint and add updated one that includes 'Renewal'
ALTER TABLE public.transactions DROP CONSTRAINT transactions_transaction_type_check;

ALTER TABLE public.transactions ADD CONSTRAINT transactions_transaction_type_check 
  CHECK (transaction_type = ANY (ARRAY['Sale'::text, 'Lease'::text, 'Sublease'::text, 'Renewal'::text, 'Unknown/Removed'::text]));