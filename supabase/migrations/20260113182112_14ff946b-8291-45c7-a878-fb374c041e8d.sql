-- Create sync_logs table to track all sync runs
CREATE TABLE public.sync_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_type text NOT NULL CHECK (run_type IN ('manual', 'scheduled')),
    triggered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    started_at timestamp with time zone NOT NULL DEFAULT now(),
    completed_at timestamp with time zone,
    status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
    rows_read integer DEFAULT 0,
    rows_imported integer DEFAULT 0,
    rows_skipped integer DEFAULT 0,
    skipped_breakdown jsonb DEFAULT '{}'::jsonb,
    error_message text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sync logs"
ON public.sync_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage sync logs"
ON public.sync_logs FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Sync operators can insert sync logs"
ON public.sync_logs FOR INSERT TO authenticated
WITH CHECK (public.can_run_sync(auth.uid()));

CREATE POLICY "Sync operators can update their sync logs"
ON public.sync_logs FOR UPDATE TO authenticated
USING (public.can_run_sync(auth.uid()) AND triggered_by = auth.uid());

-- Create sync_settings table
CREATE TABLE public.sync_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scheduled_sync_enabled boolean NOT NULL DEFAULT false,
    morning_sync_time time NOT NULL DEFAULT '07:00:00',
    evening_sync_time time NOT NULL DEFAULT '18:00:00',
    timezone text NOT NULL DEFAULT 'America/Edmonton',
    last_scheduled_run_at timestamp with time zone,
    last_scheduled_run_status text,
    google_credentials_expired boolean NOT NULL DEFAULT false,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.sync_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sync settings"
ON public.sync_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage sync settings"
ON public.sync_settings FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.sync_settings (scheduled_sync_enabled, morning_sync_time, evening_sync_time, timezone)
VALUES (false, '07:00:00', '18:00:00', 'America/Edmonton');