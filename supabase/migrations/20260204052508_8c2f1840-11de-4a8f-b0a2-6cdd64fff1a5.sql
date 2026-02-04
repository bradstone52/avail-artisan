-- Add original_filename column to store the actual uploaded filename
ALTER TABLE public.internal_listing_documents 
ADD COLUMN original_filename TEXT;