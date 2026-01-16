import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Get client IP and user agent for rate limiting/audit
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                    req.headers.get('cf-connecting-ip') || 
                    'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Helper to log attempt
  const logAttempt = async (
    code: string, 
    email: string | null, 
    userId: string | null,
    status: string, 
    errorMessage: string | null
  ) => {
    await adminClient.from('invite_redemption_attempts').insert({
      attempted_code: code,
      email_entered: email,
      ip_address: ipAddress,
      user_agent: userAgent,
      user_id: userId,
      status,
      error_message: errorMessage,
    });
  };

  try {
    // Check rate limit first
    const { data: withinLimit } = await adminClient.rpc('check_invite_rate_limit', {
      _ip_address: ipAddress
    });

    if (!withinLimit) {
      const body = await req.json().catch(() => ({}));
      await logAttempt(body.inviteCode || 'unknown', null, null, 'rate_limited', 'Too many attempts');
      return new Response(
        JSON.stringify({ error: 'Too many attempts. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { inviteCode } = await req.json();
    if (!inviteCode || typeof inviteCode !== 'string') {
      await logAttempt('', user.email || null, user.id, 'invalid', 'Missing invite code');
      return new Response(
        JSON.stringify({ error: 'Invite code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedCode = inviteCode.trim().toUpperCase();
    const userEmail = user.email?.toLowerCase() || '';
    const userEmailDomain = userEmail.split('@')[1] || '';

    // Look up invite by code
    const { data: invite, error: inviteError } = await adminClient
      .from('invites')
      .select('*')
      .eq('code', normalizedCode)
      .maybeSingle();

    if (inviteError || !invite) {
      await logAttempt(normalizedCode, userEmail, user.id, 'invalid', 'Invalid invite code');
      return new Response(
        JSON.stringify({ error: 'Invalid invite code' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already used
    if (invite.used_at) {
      await logAttempt(normalizedCode, userEmail, user.id, 'used', 'Already used');
      return new Response(
        JSON.stringify({ error: 'This invite code has already been used.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if revoked
    if (invite.revoked_at) {
      await logAttempt(normalizedCode, userEmail, user.id, 'revoked', 'Invite revoked');
      return new Response(
        JSON.stringify({ error: 'This invite has been revoked.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      await logAttempt(normalizedCode, userEmail, user.id, 'expired', 'Invite expired');
      return new Response(
        JSON.stringify({ error: 'This invite has expired.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check email lock
    if (invite.invited_email) {
      if (invite.invited_email.toLowerCase() !== userEmail) {
        await logAttempt(normalizedCode, userEmail, user.id, 'email_mismatch', 'Email mismatch');
        return new Response(
          JSON.stringify({ error: 'This invite is intended for a different email address.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check domain restriction
    if (invite.invited_domain) {
      if (invite.invited_domain.toLowerCase() !== userEmailDomain) {
        await logAttempt(normalizedCode, userEmail, user.id, 'domain_mismatch', 'Domain mismatch');
        return new Response(
          JSON.stringify({ error: 'Email domain not permitted.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // === ATOMIC REDEMPTION ===
    // Mark invite as used
    const { error: updateError } = await adminClient
      .from('invites')
      .update({
        used_at: new Date().toISOString(),
        used_by_user_id: user.id,
        used_by_email: userEmail,
      })
      .eq('id', invite.id)
      .is('used_at', null); // Atomic check - only update if still unused

    if (updateError) {
      await logAttempt(normalizedCode, userEmail, user.id, 'used', 'Race condition - already used');
      return new Response(
        JSON.stringify({ error: 'This invite code has already been used.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert user profile
    const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
    await adminClient
      .from('profiles')
      .upsert({
        id: user.id,
        email: userEmail,
        full_name: userName,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    // Remove user from any other orgs first (one org per user for now)
    await adminClient
      .from('org_members')
      .delete()
      .eq('user_id', user.id);

    // Add user to org with the invite's role
    const { error: memberError } = await adminClient
      .from('org_members')
      .insert({
        org_id: invite.org_id,
        user_id: user.id,
        role: invite.role,
      });

    if (memberError) {
      console.error('Failed to add member:', memberError);
      // Rollback invite usage
      await adminClient
        .from('invites')
        .update({ used_at: null, used_by_user_id: null, used_by_email: null })
        .eq('id', invite.id);
      
      await logAttempt(normalizedCode, userEmail, user.id, 'error', 'Failed to add to org');
      return new Response(
        JSON.stringify({ error: 'Failed to join organization' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get org details for response
    const { data: org } = await adminClient
      .from('orgs')
      .select('id, name')
      .eq('id', invite.org_id)
      .single();

    await logAttempt(normalizedCode, userEmail, user.id, 'success', null);

    return new Response(
      JSON.stringify({ 
        success: true, 
        org,
        role: invite.role,
        message: `Successfully joined ${org?.name || 'organization'} as ${invite.role}` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Redeem invite error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
