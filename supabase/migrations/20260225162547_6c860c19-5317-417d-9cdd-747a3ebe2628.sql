
-- Add new columns to prospects table
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS priority text,
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text;

-- Create prospect_tasks table
CREATE TABLE IF NOT EXISTS public.prospect_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.orgs(id),
  created_by uuid,
  title text NOT NULL,
  notes text,
  due_date date,
  completed boolean NOT NULL DEFAULT false,
  reminder_at timestamptz,
  reminder_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prospect_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies mirroring prospect_follow_up_dates
CREATE POLICY "Users can view tasks for their org prospects"
  ON public.prospect_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.prospects p
      WHERE p.id = prospect_tasks.prospect_id
        AND p.org_id IN (SELECT get_user_org_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can insert tasks for their org prospects"
  ON public.prospect_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.prospects p
      WHERE p.id = prospect_tasks.prospect_id
        AND p.org_id IN (SELECT get_user_org_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can update tasks for their org prospects"
  ON public.prospect_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.prospects p
      WHERE p.id = prospect_tasks.prospect_id
        AND p.org_id IN (SELECT get_user_org_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can delete tasks for their org prospects"
  ON public.prospect_tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.prospects p
      WHERE p.id = prospect_tasks.prospect_id
        AND p.org_id IN (SELECT get_user_org_ids(auth.uid()))
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_prospect_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_prospect_tasks_updated_at
  BEFORE UPDATE ON public.prospect_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_prospect_tasks_updated_at();

-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
