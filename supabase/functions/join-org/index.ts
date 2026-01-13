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

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create client with user's token to get their ID
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
      return new Response(
        JSON.stringify({ error: 'Invite code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role to perform lookups and inserts
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Look up org by invite code
    const { data: org, error: orgError } = await adminClient
      .from('orgs')
      .select('id, name')
      .eq('invite_code', inviteCode.trim().toUpperCase())
      .maybeSingle();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: 'Invalid invite code' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is already a member
    const { data: existingMember } = await adminClient
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .eq('org_id', org.id)
      .maybeSingle();

    if (existingMember) {
      return new Response(
        JSON.stringify({ success: true, message: 'Already a member', org }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is in another org - remove them first (one org per user for now)
    await adminClient
      .from('org_members')
      .delete()
      .eq('user_id', user.id);

    // Add user to org as member
    const { error: insertError } = await adminClient
      .from('org_members')
      .insert({
        org_id: org.id,
        user_id: user.id,
        role: 'member',
      });

    if (insertError) {
      console.error('Failed to add member:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to join organization' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, org }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Join org error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
