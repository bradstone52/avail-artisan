-- Create distribution_recipients table
CREATE TABLE public.distribution_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  title TEXT,
  email TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create distribution_sends table
CREATE TABLE public.distribution_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID NOT NULL REFERENCES public.distribution_recipients(id) ON DELETE CASCADE,
  report_id UUID NOT NULL,
  tracking_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.distribution_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribution_sends ENABLE ROW LEVEL SECURITY;

-- RLS policies: Admin-only access
CREATE POLICY "Admins can manage recipients"
ON public.distribution_recipients
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can manage sends"
ON public.distribution_sends
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_distribution_sends_recipient ON public.distribution_sends(recipient_id);
CREATE INDEX idx_distribution_sends_report ON public.distribution_sends(report_id);
CREATE INDEX idx_distribution_sends_token ON public.distribution_sends(tracking_token);