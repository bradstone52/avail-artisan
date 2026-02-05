-- Create storage bucket for internal listing photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('internal-listing-photos', 'internal-listing-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload photos
CREATE POLICY "Users can upload listing photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'internal-listing-photos');

-- Allow authenticated users to update their photos
CREATE POLICY "Users can update listing photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'internal-listing-photos');

-- Allow authenticated users to delete photos
CREATE POLICY "Users can delete listing photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'internal-listing-photos');

-- Allow public read access to listing photos
CREATE POLICY "Public can view listing photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'internal-listing-photos');