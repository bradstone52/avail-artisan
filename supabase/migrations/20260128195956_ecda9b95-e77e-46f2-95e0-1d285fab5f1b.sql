-- Add scale column to distribution_recipients table
ALTER TABLE public.distribution_recipients 
ADD COLUMN scale text NULL;