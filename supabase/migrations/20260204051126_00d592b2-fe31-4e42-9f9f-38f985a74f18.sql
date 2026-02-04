-- Create internal_listing_documents table
CREATE TABLE public.internal_listing_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.internal_listings(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.orgs(id),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_internal_listing_documents_listing_id ON public.internal_listing_documents(listing_id);
CREATE INDEX idx_internal_listing_documents_org_id ON public.internal_listing_documents(org_id);

-- Enable RLS
ALTER TABLE public.internal_listing_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access documents for listings in their organization
CREATE POLICY "Users can view documents in their org"
ON public.internal_listing_documents
FOR SELECT
USING (
  org_id IN (SELECT public.get_user_org_ids(auth.uid()))
);

CREATE POLICY "Users can insert documents in their org"
ON public.internal_listing_documents
FOR INSERT
WITH CHECK (
  org_id IN (SELECT public.get_user_org_ids(auth.uid()))
);

CREATE POLICY "Users can update documents in their org"
ON public.internal_listing_documents
FOR UPDATE
USING (
  org_id IN (SELECT public.get_user_org_ids(auth.uid()))
);

CREATE POLICY "Users can delete documents in their org"
ON public.internal_listing_documents
FOR DELETE
USING (
  org_id IN (SELECT public.get_user_org_ids(auth.uid()))
);

-- Storage bucket policies for internal-listing-assets
-- Allow authenticated users to upload files to their org's listings
CREATE POLICY "Users can upload to internal-listing-assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'internal-listing-assets'
);

-- Allow users to view files from internal-listing-assets
CREATE POLICY "Users can view internal-listing-assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'internal-listing-assets'
);

-- Allow users to delete their uploaded files
CREATE POLICY "Users can delete from internal-listing-assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'internal-listing-assets'
);