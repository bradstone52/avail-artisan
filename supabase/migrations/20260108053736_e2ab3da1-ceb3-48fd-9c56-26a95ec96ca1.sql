-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sheet connections table
CREATE TABLE public.sheet_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  sheet_url TEXT NOT NULL,
  sheet_name TEXT NOT NULL,
  tab_name TEXT DEFAULT 'Sheet1',
  connection_type TEXT NOT NULL DEFAULT 'csv' CHECK (connection_type IN ('csv', 'oauth')),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sheet_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sheet connections" ON public.sheet_connections
  FOR ALL USING (auth.uid() = user_id);

-- Issues table (snapshots)
CREATE TABLE public.issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  market TEXT NOT NULL DEFAULT 'Calgary Region',
  size_threshold INTEGER NOT NULL DEFAULT 100000,
  sort_order TEXT NOT NULL DEFAULT 'size_desc',
  brokerage_name TEXT,
  logo_url TEXT,
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  pdf_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  total_listings INTEGER NOT NULL DEFAULT 0,
  new_count INTEGER NOT NULL DEFAULT 0,
  changed_count INTEGER NOT NULL DEFAULT 0,
  removed_count INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own issues" ON public.issues
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public issues" ON public.issues
  FOR SELECT USING (is_public = true);

-- Listings table (cached from Google Sheets)
CREATE TABLE public.listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  listing_id TEXT NOT NULL,
  property_name TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  submarket TEXT NOT NULL,
  size_sf INTEGER NOT NULL,
  clear_height_ft NUMERIC,
  dock_doors INTEGER DEFAULT 0,
  drive_in_doors INTEGER DEFAULT 0,
  yard TEXT DEFAULT 'Unknown' CHECK (yard IN ('Yes', 'No', 'Unknown')),
  availability_date TEXT,
  asking_rate_psf TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Leased', 'Removed', 'OnHold')),
  include_in_issue BOOLEAN NOT NULL DEFAULT true,
  landlord TEXT,
  broker_source TEXT,
  notes_public TEXT,
  internal_note TEXT,
  link TEXT,
  photo_url TEXT,
  last_verified_date DATE,
  power_amps TEXT,
  sprinkler TEXT,
  office_percent TEXT,
  cross_dock TEXT DEFAULT 'Unknown' CHECK (cross_dock IN ('Yes', 'No', 'Unknown')),
  trailer_parking TEXT DEFAULT 'Unknown' CHECK (trailer_parking IN ('Yes', 'No', 'Unknown')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own listings" ON public.listings
  FOR ALL USING (auth.uid() = user_id);

-- Issue listings (junction table for listings included in an issue)
CREATE TABLE public.issue_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id UUID NOT NULL REFERENCES public.issues ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings ON DELETE CASCADE,
  change_status TEXT CHECK (change_status IN ('new', 'changed', 'unchanged')),
  executive_note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(issue_id, listing_id)
);

ALTER TABLE public.issue_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage issue listings through issues" ON public.issue_listings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.issues
      WHERE issues.id = issue_listings.issue_id
      AND issues.user_id = auth.uid()
    )
  );

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply update triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sheet_connections_updated_at
  BEFORE UPDATE ON public.sheet_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_issues_updated_at
  BEFORE UPDATE ON public.issues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();