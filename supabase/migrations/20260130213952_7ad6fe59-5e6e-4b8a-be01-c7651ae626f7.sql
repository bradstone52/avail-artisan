-- Create property_tenants table for tracking known tenants at properties
CREATE TABLE public.property_tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_name TEXT NOT NULL,
  unit_number TEXT,
  size_sf INTEGER,
  notes TEXT,
  tracked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tracked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.property_tenants ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups by property
CREATE INDEX idx_property_tenants_property_id ON public.property_tenants(property_id);

-- RLS Policies: Users can manage tenants for properties they created
-- For now, scope access to properties created by the authenticated user
CREATE POLICY "Users can view tenants for their properties"
ON public.property_tenants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_tenants.property_id
    AND p.created_by = auth.uid()
  )
);

CREATE POLICY "Users can add tenants to their properties"
ON public.property_tenants
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_tenants.property_id
    AND p.created_by = auth.uid()
  )
);

CREATE POLICY "Users can update tenants for their properties"
ON public.property_tenants
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_tenants.property_id
    AND p.created_by = auth.uid()
  )
);

CREATE POLICY "Users can delete tenants for their properties"
ON public.property_tenants
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_tenants.property_id
    AND p.created_by = auth.uid()
  )
);