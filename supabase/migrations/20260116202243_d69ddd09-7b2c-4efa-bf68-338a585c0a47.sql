-- Create distribution_events table for tracking views
CREATE TABLE public.distribution_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  send_id UUID NOT NULL REFERENCES public.distribution_sends(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'view',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  ip_address TEXT
);

-- Enable RLS
ALTER TABLE public.distribution_events ENABLE ROW LEVEL SECURITY;

-- Admins can view all events
CREATE POLICY "Admins can view events"
ON public.distribution_events
FOR SELECT
USING (is_admin(auth.uid()));

-- Allow public inserts for tracking (no auth required)
CREATE POLICY "Anyone can insert view events"
ON public.distribution_events
FOR INSERT
WITH CHECK (true);

-- Add index for fast lookups
CREATE INDEX idx_distribution_events_send_id ON public.distribution_events(send_id);
CREATE INDEX idx_distribution_sends_tracking_token ON public.distribution_sends(tracking_token);