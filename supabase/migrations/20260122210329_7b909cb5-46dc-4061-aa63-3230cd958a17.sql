-- Create asset_managers table for the management company
CREATE TABLE public.asset_managers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create asset_manager_contacts table for contacts within a management company
CREATE TABLE public.asset_manager_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_manager_id UUID NOT NULL REFERENCES public.asset_managers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  title TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create junction table to link assets to asset managers
CREATE TABLE public.asset_to_asset_manager (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  asset_manager_id UUID NOT NULL REFERENCES public.asset_managers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(asset_id, asset_manager_id)
);

-- Enable RLS on all tables
ALTER TABLE public.asset_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_manager_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_to_asset_manager ENABLE ROW LEVEL SECURITY;

-- RLS policies for asset_managers
CREATE POLICY "Authenticated users can view asset managers"
  ON public.asset_managers FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert asset managers"
  ON public.asset_managers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update asset managers"
  ON public.asset_managers FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete asset managers"
  ON public.asset_managers FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- RLS policies for asset_manager_contacts
CREATE POLICY "Authenticated users can view asset manager contacts"
  ON public.asset_manager_contacts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert asset manager contacts"
  ON public.asset_manager_contacts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update asset manager contacts"
  ON public.asset_manager_contacts FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete asset manager contacts"
  ON public.asset_manager_contacts FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- RLS policies for asset_to_asset_manager
CREATE POLICY "Authenticated users can view asset manager links"
  ON public.asset_to_asset_manager FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert asset manager links"
  ON public.asset_to_asset_manager FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete asset manager links"
  ON public.asset_to_asset_manager FOR DELETE
  USING (auth.uid() IS NOT NULL);