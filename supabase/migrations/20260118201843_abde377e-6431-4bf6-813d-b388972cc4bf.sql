-- Create share_links table for tokenized map access
CREATE TABLE public.share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  issue_id uuid REFERENCES public.issues(id) ON DELETE CASCADE,
  report_type text NOT NULL DEFAULT 'distribution',
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  listing_ids text[] DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- Authenticated users can create share links
CREATE POLICY "Authenticated users can insert share_links"
ON public.share_links
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Authenticated users can view their own share links
CREATE POLICY "Authenticated users can view share_links"
ON public.share_links
FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

-- Authenticated users can update their own share links
CREATE POLICY "Authenticated users can update share_links"
ON public.share_links
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

-- Admins can manage all share links
CREATE POLICY "Admins can manage share_links"
ON public.share_links
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Add latitude/longitude columns to listings table for map display
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric;

-- Create index for faster geospatial queries
CREATE INDEX IF NOT EXISTS idx_listings_coordinates 
ON public.listings (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;