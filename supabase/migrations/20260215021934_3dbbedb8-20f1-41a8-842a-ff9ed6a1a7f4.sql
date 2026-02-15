-- Create property-photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-photos', 'property-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload property photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'property-photos' AND auth.uid() IS NOT NULL);

-- Allow public read access
CREATE POLICY "Property photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-photos');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete property photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'property-photos' AND auth.uid() IS NOT NULL);