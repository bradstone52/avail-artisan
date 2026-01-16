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
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Get client IP for rate limiting
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
      await logAttempt(body.inviteCode || 'unknown', body.email || null, null, 'rate_limited', 'Too many attempts');
      return new Response(
        JSON.stringify({ error: 'Too many attempts. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { inviteCode, email, password, fullName } = await req.json();

    // Validate inputs
    if (!inviteCode || typeof inviteCode !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invite code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedCode = inviteCode.trim().toUpperCase();
    const normalizedEmail = email.trim().toLowerCase();
    const emailDomain = normalizedEmail.split('@')[1] || '';

    // Look up invite by code FIRST (before creating user)
    const { data: invite, error: inviteError } = await adminClient
      .from('invites')
      .select('*')
      .eq('code', normalizedCode)
      .maybeSingle();

    if (inviteError || !invite) {
      await logAttempt(normalizedCode, normalizedEmail, null, 'invalid', 'Invalid invite code');
      return new Response(
        JSON.stringify({ error: 'Invalid invite code' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already used
    if (invite.used_at) {
      await logAttempt(normalizedCode, normalizedEmail, null, 'used', 'Already used');
      return new Response(
        JSON.stringify({ error: 'This invite code has already been used.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if revoked
    if (invite.revoked_at) {
      await logAttempt(normalizedCode, normalizedEmail, null, 'revoked', 'Invite revoked');
      return new Response(
        JSON.stringify({ error: 'This invite has been revoked.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      await logAttempt(normalizedCode, normalizedEmail, null, 'expired', 'Invite expired');
      return new Response(
        JSON.stringify({ error: 'This invite has expired.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check email lock
    if (invite.invited_email) {
      if (invite.invited_email.toLowerCase() !== normalizedEmail) {
        await logAttempt(normalizedCode, normalizedEmail, null, 'email_mismatch', 'Email mismatch');
        return new Response(
          JSON.stringify({ error: 'This invite is intended for a different email address.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check domain restriction
    if (invite.invited_domain) {
      if (invite.invited_domain.toLowerCase() !== emailDomain) {
        await logAttempt(normalizedCode, normalizedEmail, null, 'domain_mismatch', 'Domain mismatch');
        return new Response(
          JSON.stringify({ error: 'Email domain not permitted.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // === INVITE IS VALID - NOW CREATE USER ===
    
    // Create the user using admin API
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: password,
      email_confirm: true, // Auto-confirm since they have a valid invite
      user_metadata: {
        full_name: fullName || normalizedEmail.split('@')[0],
      },
    });

    if (createError) {
      console.error('User creation error:', createError);
      if (createError.message.includes('already been registered') || createError.message.includes('already exists')) {
        return new Response(
          JSON.stringify({ error: 'This email is already registered. Please sign in instead.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'Failed to create account: ' + createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUser = authData.user;
    if (!newUser) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === ATOMIC REDEMPTION ===
    const { error: updateError } = await adminClient
      .from('invites')
      .update({
        used_at: new Date().toISOString(),
        used_by_user_id: newUser.id,
        used_by_email: normalizedEmail,
      })
      .eq('id', invite.id)
      .is('used_at', null);

    if (updateError) {
      // Rollback: delete the user we just created
      await adminClient.auth.admin.deleteUser(newUser.id);
      await logAttempt(normalizedCode, normalizedEmail, null, 'used', 'Race condition - already used');
      return new Response(
        JSON.stringify({ error: 'This invite code has already been used.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user profile
    const userName = fullName || normalizedEmail.split('@')[0];
    await adminClient
      .from('profiles')
      .upsert({
        id: newUser.id,
        email: normalizedEmail,
        full_name: userName,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    // Add user to org
    const { error: memberError } = await adminClient
      .from('org_members')
      .insert({
        org_id: invite.org_id,
        user_id: newUser.id,
        role: invite.role,
      });

    if (memberError) {
      console.error('Failed to add member:', memberError);
      // Rollback
      await adminClient.auth.admin.deleteUser(newUser.id);
      await adminClient
        .from('invites')
        .update({ used_at: null, used_by_user_id: null, used_by_email: null })
        .eq('id', invite.id);
      
      await logAttempt(normalizedCode, normalizedEmail, null, 'error', 'Failed to add to org');
      return new Response(
        JSON.stringify({ error: 'Failed to join organization' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get org details
    const { data: org } = await adminClient
      .from('orgs')
      .select('id, name')
      .eq('id', invite.org_id)
      .single();

    await logAttempt(normalizedCode, normalizedEmail, newUser.id, 'success', null);

    return new Response(
      JSON.stringify({ 
        success: true, 
        org,
        role: invite.role,
        message: `Account created! You've joined ${org?.name || 'the organization'} as ${invite.role}.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Signup with invite error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
