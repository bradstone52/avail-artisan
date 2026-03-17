
-- 1. Add website_published column to internal_listings
ALTER TABLE public.internal_listings 
ADD COLUMN IF NOT EXISTS website_published boolean NOT NULL DEFAULT false;

-- 2. Add index for public query performance
CREATE INDEX IF NOT EXISTS idx_internal_listings_website_published 
ON public.internal_listings (website_published, status) 
WHERE website_published = true;

-- 3. Public SELECT policy on internal_listings (anon can read published+active rows)
CREATE POLICY "Public can view published listings"
ON public.internal_listings
FOR SELECT
TO anon
USING (website_published = true AND status = 'Active');

-- 4. Public SELECT policy on internal_listing_photos
CREATE POLICY "Public can view photos of published listings"
ON public.internal_listing_photos
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.internal_listings l
    WHERE l.id = listing_id
      AND l.website_published = true
      AND l.status = 'Active'
  )
);

-- 5. Public SELECT policy on agents
CREATE POLICY "Public can view agents of published listings"
ON public.agents
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.internal_listings l
    WHERE (l.assigned_agent_id = agents.id OR l.secondary_agent_id = agents.id)
      AND l.website_published = true
      AND l.status = 'Active'
  )
);

-- 6. Create public_listing_inquiries table
CREATE TABLE public.public_listing_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.internal_listings(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Enable RLS on public_listing_inquiries
ALTER TABLE public.public_listing_inquiries ENABLE ROW LEVEL SECURITY;

-- 8. Anon can INSERT
CREATE POLICY "Anyone can submit an inquiry"
ON public.public_listing_inquiries
FOR INSERT
TO anon
WITH CHECK (true);

-- 9. Authenticated users can SELECT
CREATE POLICY "Authenticated users can view inquiries"
ON public.public_listing_inquiries
FOR SELECT
TO authenticated
USING (true);

-- 10. Authenticated users can delete inquiries
CREATE POLICY "Authenticated users can delete inquiries"
ON public.public_listing_inquiries
FOR DELETE
TO authenticated
USING (true);
