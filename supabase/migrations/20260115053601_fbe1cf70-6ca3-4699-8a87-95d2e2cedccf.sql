-- Create storage bucket for cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('cover-images', 'cover-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to cover images
CREATE POLICY "Cover images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'cover-images');

-- Allow authenticated users to upload cover images
CREATE POLICY "Authenticated users can upload cover images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'cover-images' AND auth.uid() IS NOT NULL);

-- Allow users to update/replace their uploads
CREATE POLICY "Authenticated users can update cover images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'cover-images' AND auth.uid() IS NOT NULL);

-- Allow users to delete cover images
CREATE POLICY "Authenticated users can delete cover images"
ON storage.objects FOR DELETE
USING (bucket_id = 'cover-images' AND auth.uid() IS NOT NULL);

-- Add cover_image_url column to issues table
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS cover_image_url TEXT;