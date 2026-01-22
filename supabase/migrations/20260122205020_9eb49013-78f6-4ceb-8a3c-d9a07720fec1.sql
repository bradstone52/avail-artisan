-- Create storage bucket for asset photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('asset-photos', 'asset-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to asset photos
CREATE POLICY "Asset photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'asset-photos');

-- Allow authenticated users to upload asset photos
CREATE POLICY "Authenticated users can upload asset photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'asset-photos' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to update their own asset photos
CREATE POLICY "Authenticated users can update asset photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'asset-photos' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to delete asset photos
CREATE POLICY "Authenticated users can delete asset photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'asset-photos' AND auth.uid() IS NOT NULL);