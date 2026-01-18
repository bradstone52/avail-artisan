-- Create distribution_batches table
CREATE TABLE public.distribution_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  is_active boolean NOT NULL DEFAULT false
);

-- Create distribution_recipient_batch_status table
CREATE TABLE public.distribution_recipient_batch_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.distribution_batches(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.distribution_recipients(id) ON DELETE CASCADE,
  replied boolean NOT NULL DEFAULT false,
  reply_date date,
  next_step text,
  owner_user_id uuid REFERENCES auth.users(id),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(batch_id, recipient_id)
);

-- Enable RLS on both tables
ALTER TABLE public.distribution_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribution_recipient_batch_status ENABLE ROW LEVEL SECURITY;

-- RLS policies for distribution_batches - all authenticated users can manage
CREATE POLICY "Authenticated users can view batches"
ON public.distribution_batches
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert batches"
ON public.distribution_batches
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update batches"
ON public.distribution_batches
FOR UPDATE
TO authenticated
USING (true);

-- RLS policies for distribution_recipient_batch_status - all authenticated users can manage
CREATE POLICY "Authenticated users can view batch status"
ON public.distribution_recipient_batch_status
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert batch status"
ON public.distribution_recipient_batch_status
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update batch status"
ON public.distribution_recipient_batch_status
FOR UPDATE
TO authenticated
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_batch_status_batch_id ON public.distribution_recipient_batch_status(batch_id);
CREATE INDEX idx_batch_status_recipient_id ON public.distribution_recipient_batch_status(recipient_id);
CREATE INDEX idx_batches_is_active ON public.distribution_batches(is_active) WHERE is_active = true;