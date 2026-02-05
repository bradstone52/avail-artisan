-- Drop and recreate the INSERT policy with proper auth check
DROP POLICY IF EXISTS "Users can upload listing photos" ON storage.objects;

CREATE POLICY "Users can upload listing photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'internal-listing-photos');

-- Also fix UPDATE and DELETE to require auth
DROP POLICY IF EXISTS "Users can update listing photos" ON storage.objects;

CREATE POLICY "Users can update listing photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'internal-listing-photos');

DROP POLICY IF EXISTS "Users can delete listing photos" ON storage.objects;

CREATE POLICY "Users can delete listing photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'internal-listing-photos');