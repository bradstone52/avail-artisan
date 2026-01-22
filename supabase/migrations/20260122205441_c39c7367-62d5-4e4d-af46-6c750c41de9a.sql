-- Create table for multiple asset photos
CREATE TABLE public.asset_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create index for faster lookups
CREATE INDEX idx_asset_photos_asset_id ON public.asset_photos(asset_id);

-- Enable RLS
ALTER TABLE public.asset_photos ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view asset photos"
ON public.asset_photos FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert asset photos"
ON public.asset_photos FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update asset photos"
ON public.asset_photos FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete asset photos"
ON public.asset_photos FOR DELETE
USING (auth.uid() IS NOT NULL);