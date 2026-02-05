-- Create table for additional listing photos (beyond the main cover photo)
CREATE TABLE public.internal_listing_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.internal_listings(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.orgs(id),
  photo_url TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER DEFAULT 0,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by UUID
);

-- Enable RLS
ALTER TABLE public.internal_listing_photos ENABLE ROW LEVEL SECURITY;

-- RLS policies for org-based access
CREATE POLICY "Users can view photos for listings in their org"
ON public.internal_listing_photos
FOR SELECT
USING (
  org_id IN (SELECT public.get_user_org_ids(auth.uid()))
);

CREATE POLICY "Users can insert photos for listings in their org"
ON public.internal_listing_photos
FOR INSERT
WITH CHECK (
  org_id IN (SELECT public.get_user_org_ids(auth.uid()))
);

CREATE POLICY "Users can update photos for listings in their org"
ON public.internal_listing_photos
FOR UPDATE
USING (
  org_id IN (SELECT public.get_user_org_ids(auth.uid()))
);

CREATE POLICY "Users can delete photos for listings in their org"
ON public.internal_listing_photos
FOR DELETE
USING (
  org_id IN (SELECT public.get_user_org_ids(auth.uid()))
);

-- Create index for efficient querying
CREATE INDEX idx_internal_listing_photos_listing_id ON public.internal_listing_photos(listing_id);
CREATE INDEX idx_internal_listing_photos_org_id ON public.internal_listing_photos(org_id);