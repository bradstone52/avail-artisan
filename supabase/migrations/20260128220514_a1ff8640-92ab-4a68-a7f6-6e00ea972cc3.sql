-- Add type and source columns to prospects table
ALTER TABLE public.prospects 
ADD COLUMN prospect_type text DEFAULT 'Tenant',
ADD COLUMN source text DEFAULT 'Network';