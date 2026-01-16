-- Create invites table for secure, single-use invite codes
CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE DEFAULT upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 10)),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  invited_email TEXT,
  invited_domain TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by_user_id UUID,
  used_by_email TEXT,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invite redemption attempts table for audit/rate limiting
CREATE TABLE public.invite_redemption_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempted_code TEXT NOT NULL,
  email_entered TEXT,
  ip_address TEXT,
  user_agent TEXT,
  user_id UUID,
  status TEXT NOT NULL, -- 'success', 'invalid', 'used', 'expired', 'revoked', 'email_mismatch', 'domain_mismatch', 'rate_limited'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_redemption_attempts ENABLE ROW LEVEL SECURITY;

-- Invites policies: Only admins can manage invites for their org
CREATE POLICY "Admins can view org invites"
ON public.invites FOR SELECT
USING (
  is_admin(auth.uid()) AND 
  org_id IN (SELECT get_user_org_ids(auth.uid()))
);

CREATE POLICY "Admins can create org invites"
ON public.invites FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) AND 
  org_id IN (SELECT get_user_org_ids(auth.uid())) AND
  created_by_user_id = auth.uid()
);

CREATE POLICY "Admins can update org invites"
ON public.invites FOR UPDATE
USING (
  is_admin(auth.uid()) AND 
  org_id IN (SELECT get_user_org_ids(auth.uid()))
);

-- Redemption attempts: Admins can view, service role can insert
CREATE POLICY "Admins can view redemption attempts"
ON public.invite_redemption_attempts FOR SELECT
USING (is_admin(auth.uid()));

-- Create index for faster code lookups
CREATE INDEX idx_invites_code ON public.invites(code);
CREATE INDEX idx_invites_org_id ON public.invites(org_id);
CREATE INDEX idx_redemption_attempts_code ON public.invite_redemption_attempts(attempted_code);
CREATE INDEX idx_redemption_attempts_ip ON public.invite_redemption_attempts(ip_address);
CREATE INDEX idx_redemption_attempts_created ON public.invite_redemption_attempts(created_at);

-- Function to generate unique invite codes
CREATE OR REPLACE FUNCTION public.generate_invite_code_v2()
RETURNS TEXT
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT upper(
    substring(
      encode(sha256(random()::text::bytea || clock_timestamp()::text::bytea), 'hex')
      from 1 for 10
    )
  )
$$;

-- Function to check rate limiting (max 10 attempts per IP per hour)
CREATE OR REPLACE FUNCTION public.check_invite_rate_limit(_ip_address TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) < 10
  FROM public.invite_redemption_attempts
  WHERE ip_address = _ip_address
    AND created_at > now() - interval '1 hour'
$$;