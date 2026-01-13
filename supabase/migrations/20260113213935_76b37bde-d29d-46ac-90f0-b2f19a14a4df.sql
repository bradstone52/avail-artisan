-- Create org_integrations table for org-owned Google integration
CREATE TABLE public.org_integrations (
  org_id uuid PRIMARY KEY REFERENCES public.orgs(id) ON DELETE CASCADE,
  google_refresh_token text,
  google_access_token text,
  google_token_expiry timestamptz,
  sheet_url text,
  sheet_id text,
  tab_name text DEFAULT 'Vacancy_List',
  header_row integer DEFAULT 2,
  last_synced_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.org_integrations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Org members can view their org integration"
ON public.org_integrations
FOR SELECT
USING (org_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org admins can manage their org integration"
ON public.org_integrations
FOR ALL
USING (public.is_org_admin(auth.uid(), org_id))
WITH CHECK (public.is_org_admin(auth.uid(), org_id));

-- Trigger to update updated_at
CREATE TRIGGER update_org_integrations_updated_at
BEFORE UPDATE ON public.org_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();