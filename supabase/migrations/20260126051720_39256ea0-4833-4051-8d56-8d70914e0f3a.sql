-- Create brokerage profiles table for storing extraction hints
CREATE TABLE public.brokerage_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  extraction_hints JSONB DEFAULT '{}'::jsonb,
  sample_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create staging table for PDF-extracted listings before import
CREATE TABLE public.pdf_import_staging (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_batch_id UUID NOT NULL,
  brokerage_id UUID REFERENCES public.brokerage_profiles(id),
  source_filename TEXT NOT NULL,
  extracted_data JSONB NOT NULL,
  matched_listing_id UUID REFERENCES public.market_listings(id),
  match_confidence NUMERIC,
  import_status TEXT NOT NULL DEFAULT 'pending',
  import_action TEXT,
  imported_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create import batches table to track each upload session
CREATE TABLE public.pdf_import_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brokerage_id UUID REFERENCES public.brokerage_profiles(id),
  filename TEXT NOT NULL,
  file_path TEXT,
  total_listings INTEGER DEFAULT 0,
  imported_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.brokerage_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_import_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_import_batches ENABLE ROW LEVEL SECURITY;

-- RLS policies for brokerage_profiles
CREATE POLICY "Authenticated users can view brokerage profiles"
  ON public.brokerage_profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert brokerage profiles"
  ON public.brokerage_profiles FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update brokerage profiles"
  ON public.brokerage_profiles FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- RLS policies for pdf_import_staging
CREATE POLICY "Authenticated users can view staging records"
  ON public.pdf_import_staging FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert staging records"
  ON public.pdf_import_staging FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update staging records"
  ON public.pdf_import_staging FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete staging records"
  ON public.pdf_import_staging FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- RLS policies for pdf_import_batches
CREATE POLICY "Authenticated users can view import batches"
  ON public.pdf_import_batches FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert import batches"
  ON public.pdf_import_batches FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update import batches"
  ON public.pdf_import_batches FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at on brokerage_profiles
CREATE TRIGGER update_brokerage_profiles_updated_at
  BEFORE UPDATE ON public.brokerage_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();