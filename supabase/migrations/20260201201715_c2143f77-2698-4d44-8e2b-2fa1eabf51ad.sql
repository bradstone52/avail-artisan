-- Fix: Make property-brochures bucket private
-- Public buckets bypass RLS policies on storage.objects
UPDATE storage.buckets 
SET public = false 
WHERE id = 'property-brochures';