-- Add listing_removal_date column for Unknown/Removed transactions
ALTER TABLE public.transactions 
ADD COLUMN listing_removal_date date NULL;