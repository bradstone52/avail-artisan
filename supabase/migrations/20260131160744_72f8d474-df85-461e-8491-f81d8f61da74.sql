-- Add lease_expiry column to property_tenants
ALTER TABLE public.property_tenants
ADD COLUMN lease_expiry date;