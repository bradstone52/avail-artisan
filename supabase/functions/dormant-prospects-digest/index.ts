import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
    const FROM_EMAIL = 'listings@logistics-space.net';

    // Calculate threshold: 14 days ago
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - 14);
    const thresholdISO = threshold.toISOString();

    // Fetch dormant prospects: last_contacted_at is null OR older than 14 days, not closed
    const { data: prospects, error: prospectsError } = await supabase
      .from('prospects')
      .select('id, name, company, prospect_type, follow_up_date, last_contacted_at, user_id')
      .neq('status', 'Closed')
      .or(`last_contacted_at.is.null,last_contacted_at.lt.${thresholdISO}`);

    if (prospectsError) throw prospectsError;
    if (!prospects || prospects.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No dormant prospects' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Group prospects by user_id
    const byUser: Record<string, typeof prospects> = {};
    for (const p of prospects) {
      if (!byUser[p.user_id]) byUser[p.user_id] = [];
      byUser[p.user_id].push(p);
    }

    let sent = 0;
    const errors: string[] = [];

    for (const [userId, userProspects] of Object.entries(byUser)) {
      try {
        // Get user email from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', userId)
          .maybeSingle();

        if (!profile?.email) continue;

        // Build table rows
        const rows = userProspects.map(p => {
          const daysSince = p.last_contacted_at
            ? Math.floor((Date.now() - new Date(p.last_contacted_at).getTime()) / 86400000)
            : null;
          const daysSinceStr = daysSince !== null ? `${daysSince} days ago` : 'Never';
          const followUpStr = p.follow_up_date
            ? new Date(p.follow_up_date).toLocaleDateString('en-CA', { dateStyle: 'medium' })
            : '—';
          return `
            <tr>
              <td style="padding:8px;border:1px solid #e2e8f0">${p.name}</td>
              <td style="padding:8px;border:1px solid #e2e8f0">${p.company ?? '—'}</td>
              <td style="padding:8px;border:1px solid #e2e8f0">${p.prospect_type ?? '—'}</td>
              <td style="padding:8px;border:1px solid #e2e8f0">${daysSinceStr}</td>
              <td style="padding:8px;border:1px solid #e2e8f0">${followUpStr}</td>
            </tr>
          `;
        }).join('');

        const emailBody = `
          <p>Hi ${profile.full_name ?? ''},</p>
          <p>Here are your prospects you haven't been in touch with for 2+ weeks:</p>
          <table style="border-collapse:collapse;width:100%;margin:16px 0;font-size:14px">
            <thead>
              <tr style="background:#f8fafc">
                <th style="padding:8px;border:1px solid #e2e8f0;text-align:left">Name</th>
                <th style="padding:8px;border:1px solid #e2e8f0;text-align:left">Company</th>
                <th style="padding:8px;border:1px solid #e2e8f0;text-align:left">Type</th>
                <th style="padding:8px;border:1px solid #e2e8f0;text-align:left">Last Contacted</th>
                <th style="padding:8px;border:1px solid #e2e8f0;text-align:left">Follow-up Date</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <p style="color:#6b7280;font-size:13px">
            Log in to update contact dates or schedule follow-ups.
          </p>
        `;

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `ClearView <${FROM_EMAIL}>`,
            to: [profile.email],
            subject: `Dormant Prospects Digest — ${userProspects.length} prospect${userProspects.length > 1 ? 's' : ''} need attention`,
            html: emailBody,
          }),
        });

        if (res.ok) {
          sent++;
        } else {
          const err = await res.text();
          errors.push(`User ${userId}: ${err}`);
        }
      } catch (err) {
        errors.push(`User ${userId}: ${err}`);
      }
    }

    return new Response(
      JSON.stringify({ sent, errors: errors.length > 0 ? errors : undefined }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Error in dormant-prospects-digest:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
