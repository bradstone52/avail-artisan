-- Add contact title fields to issues table
ALTER TABLE public.issues
ADD COLUMN IF NOT EXISTS primary_contact_title text,
ADD COLUMN IF NOT EXISTS secondary_contact_title text;