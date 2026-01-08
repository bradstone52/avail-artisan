-- Add PDF-related columns to issues table
ALTER TABLE public.issues
ADD COLUMN pdf_filename TEXT,
ADD COLUMN pdf_filesize INTEGER,
ADD COLUMN pdf_generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN pdf_share_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN pdf_share_token TEXT UNIQUE;

-- Create index for share token lookup
CREATE INDEX idx_issues_pdf_share_token ON public.issues(pdf_share_token) WHERE pdf_share_token IS NOT NULL;

-- Create storage bucket for issue PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('issue-pdfs', 'issue-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for issue PDFs bucket
CREATE POLICY "Anyone can view public PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'issue-pdfs');

CREATE POLICY "Authenticated users can upload PDFs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'issue-pdfs' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update their PDFs"
ON storage.objects FOR UPDATE
USING (bucket_id = 'issue-pdfs' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete their PDFs"
ON storage.objects FOR DELETE
USING (bucket_id = 'issue-pdfs' AND auth.role() = 'authenticated');