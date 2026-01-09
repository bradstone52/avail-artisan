-- Add secondary contact fields to issues table
ALTER TABLE public.issues
ADD COLUMN IF NOT EXISTS secondary_contact_name text,
ADD COLUMN IF NOT EXISTS secondary_contact_email text,
ADD COLUMN IF NOT EXISTS secondary_contact_phone text;