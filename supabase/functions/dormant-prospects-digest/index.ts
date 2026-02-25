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

    // Fetch all incomplete tasks for non-closed prospects
    const { data: allProspects, error: allProspectsError } = await supabase
      .from('prospects')
      .select('id, name, company, user_id')
      .neq('status', 'Closed');

    if (allProspectsError) throw allProspectsError;

    const prospectIds = (allProspects || []).map((p: any) => p.id);

    let tasksByProspect: Record<string, any[]> = {};
    if (prospectIds.length > 0) {
      const { data: tasks, error: tasksError } = await supabase
        .from('prospect_tasks')
        .select('id, prospect_id, title, notes, due_date, completed')
        .in('prospect_id', prospectIds)
        .eq('completed', false)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (tasksError) throw tasksError;

      for (const task of (tasks || [])) {
        if (!tasksByProspect[task.prospect_id]) tasksByProspect[task.prospect_id] = [];
        tasksByProspect[task.prospect_id].push(task);
      }
    }

    // Build a map of prospect id -> prospect info for task section
    const prospectMap: Record<string, any> = {};
    for (const p of (allProspects || [])) {
      prospectMap[p.id] = p;
    }

    // Collect all user_ids that need a digest (dormant prospects OR outstanding tasks)
    const userIdsWithDormant = new Set((prospects || []).map((p: any) => p.user_id));
    const userIdsWithTasks = new Set<string>();
    for (const pid of Object.keys(tasksByProspect)) {
      const prospect = prospectMap[pid];
      if (prospect) userIdsWithTasks.add(prospect.user_id);
    }
    const allUserIds = new Set([...userIdsWithDormant, ...userIdsWithTasks]);

    if (allUserIds.size === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No dormant prospects or outstanding tasks' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Group dormant prospects by user_id
    const dormantByUser: Record<string, typeof prospects> = {};
    for (const p of (prospects || [])) {
      if (!dormantByUser[p.user_id]) dormantByUser[p.user_id] = [];
      dormantByUser[p.user_id].push(p);
    }

    // Group outstanding tasks by user_id -> prospect
    const tasksByUser: Record<string, Array<{ prospect: any; tasks: any[] }>> = {};
    for (const [pid, tasks] of Object.entries(tasksByProspect)) {
      const prospect = prospectMap[pid];
      if (!prospect) continue;
      if (!tasksByUser[prospect.user_id]) tasksByUser[prospect.user_id] = [];
      tasksByUser[prospect.user_id].push({ prospect, tasks });
    }

    let sent = 0;
    const errors: string[] = [];

    for (const userId of allUserIds) {
      try {
        // Get user email from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', userId)
          .maybeSingle();

        if (!profile?.email) continue;

        const userDormant = dormantByUser[userId] || [];
        const userTaskGroups = tasksByUser[userId] || [];

        // ---- Section 1: Dormant Prospects ----
        let dormantSection = '';
        const today = new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        if (userDormant.length > 0) {
          const rows = userDormant.map((p: any) => {
            const daysSince = p.last_contacted_at
              ? Math.floor((Date.now() - new Date(p.last_contacted_at).getTime()) / 86400000)
              : null;
            const daysSinceStr = daysSince !== null ? `${daysSince}d ago` : 'Never';
            const isStale = daysSince === null || daysSince >= 30;
            const followUpStr = p.follow_up_date
              ? new Date(p.follow_up_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
              : '—';
            const followUpOverdue = p.follow_up_date && new Date(p.follow_up_date) < new Date();
            return `
              <tr style="border-bottom:1px solid #e8edf2;">
                <td style="padding:12px 16px;">
                  <div style="font-weight:600;color:#0f172a;font-size:14px;">${p.name}</div>
                  <div style="color:#64748b;font-size:12px;margin-top:2px;">${p.company ?? ''}</div>
                </td>
                <td style="padding:12px 16px;">
                  <span style="background:#f1f5f9;color:#475569;font-size:12px;padding:3px 8px;border-radius:20px;white-space:nowrap;">${p.prospect_type ?? 'General'}</span>
                </td>
                <td style="padding:12px 16px;">
                  <span style="background:${isStale ? '#fef2f2' : '#fff7ed'};color:${isStale ? '#b91c1c' : '#c2410c'};font-size:12px;font-weight:600;padding:3px 8px;border-radius:20px;white-space:nowrap;">${daysSinceStr}</span>
                </td>
                <td style="padding:12px 16px;color:${followUpOverdue ? '#dc2626' : '#475569'};font-size:13px;font-weight:${followUpOverdue ? '600' : '400'};">
                  ${followUpOverdue ? '⚠ ' : ''}${followUpStr}
                </td>
              </tr>
            `;
          }).join('');

          dormantSection = `
            <div style="margin-bottom:32px;">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                <div style="background:#fff7ed;border-radius:8px;padding:8px;display:inline-block;">
                  <span style="font-size:20px;">🕐</span>
                </div>
                <div>
                  <h2 style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">Dormant Prospects</h2>
                  <p style="margin:0;font-size:12px;color:#94a3b8;">No contact in 14+ days</p>
                </div>
                <span style="margin-left:auto;background:#f97316;color:#fff;font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px;">${userDormant.length} prospect${userDormant.length !== 1 ? 's' : ''}</span>
              </div>
              <table style="width:100%;border-collapse:collapse;font-size:14px;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e8edf2;">
                <thead>
                  <tr style="background:#f8fafc;">
                    <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;border-bottom:1px solid #e8edf2;">Prospect</th>
                    <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;border-bottom:1px solid #e8edf2;">Type</th>
                    <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;border-bottom:1px solid #e8edf2;">Last Contact</th>
                    <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;border-bottom:1px solid #e8edf2;">Follow-up</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          `;
        }

        // ---- Section 2: Outstanding Tasks ----
        let tasksSection = '';
        if (userTaskGroups.length > 0) {
          const totalTasks = userTaskGroups.reduce((sum, g) => sum + g.tasks.length, 0);
          const taskRows = userTaskGroups.map(({ prospect, tasks }) => {
            return tasks.map((t: any) => {
              const dueDateStr = t.due_date
                ? new Date(t.due_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
                : '—';
              const isOverdue = t.due_date && new Date(t.due_date) < new Date();
              return `
                <tr style="border-bottom:1px solid #e8edf2;">
                  <td style="padding:12px 16px;">
                    <div style="font-weight:600;color:#0f172a;font-size:14px;">${t.title}</div>
                    ${t.notes ? `<div style="color:#94a3b8;font-size:12px;margin-top:2px;">${t.notes}</div>` : ''}
                  </td>
                  <td style="padding:12px 16px;">
                    <div style="font-size:13px;color:#475569;">${prospect.name}</div>
                    <div style="font-size:11px;color:#94a3b8;">${prospect.company ?? ''}</div>
                  </td>
                  <td style="padding:12px 16px;">
                    <span style="background:${isOverdue ? '#fef2f2' : '#f0fdf4'};color:${isOverdue ? '#b91c1c' : '#15803d'};font-size:12px;font-weight:600;padding:3px 8px;border-radius:20px;white-space:nowrap;">
                      ${isOverdue ? '⚠ Overdue · ' : ''}${dueDateStr}
                    </span>
                  </td>
                </tr>
              `;
            }).join('');
          }).join('');

          tasksSection = `
            <div style="margin-bottom:32px;">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                <div style="background:#f0fdf4;border-radius:8px;padding:8px;display:inline-block;">
                  <span style="font-size:20px;">✅</span>
                </div>
                <div>
                  <h2 style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">Outstanding To-Do Items</h2>
                  <p style="margin:0;font-size:12px;color:#94a3b8;">Incomplete tasks across all prospects</p>
                </div>
                <span style="margin-left:auto;background:#16a34a;color:#fff;font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px;">${totalTasks} task${totalTasks !== 1 ? 's' : ''}</span>
              </div>
              <table style="width:100%;border-collapse:collapse;font-size:14px;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e8edf2;">
                <thead>
                  <tr style="background:#f8fafc;">
                    <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;border-bottom:1px solid #e8edf2;">Task</th>
                    <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;border-bottom:1px solid #e8edf2;">Prospect</th>
                    <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;border-bottom:1px solid #e8edf2;">Due</th>
                  </tr>
                </thead>
                <tbody>${taskRows}</tbody>
              </table>
            </div>
          `;
        }

        const totalTasks = userTaskGroups.reduce((sum, g) => sum + g.tasks.length, 0);
        const subjectParts = [];
        if (userDormant.length > 0) subjectParts.push(`${userDormant.length} dormant prospect${userDormant.length !== 1 ? 's' : ''}`);
        if (totalTasks > 0) subjectParts.push(`${totalTasks} outstanding task${totalTasks !== 1 ? 's' : ''}`);

        const emailBody = `
          <!DOCTYPE html>
          <html>
          <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
              <tr><td align="center">
                <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;">

                  <!-- HEADER -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);border-radius:12px 12px 0 0;padding:32px 36px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td>
                            <div style="font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#64748b;margin-bottom:6px;">ClearView Partners</div>
                            <div style="font-size:26px;font-weight:700;color:#ffffff;line-height:1.2;">Prospects Digest</div>
                            <div style="font-size:13px;color:#94a3b8;margin-top:6px;">${today}</div>
                          </td>
                          <td align="right" style="vertical-align:top;">
                            <div style="background:rgba(255,255,255,0.08);border-radius:10px;padding:12px 16px;text-align:center;display:inline-block;">
                              <div style="font-size:28px;font-weight:800;color:#f97316;">${userDormant.length + totalTasks}</div>
                              <div style="font-size:11px;color:#94a3b8;margin-top:2px;">items to action</div>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- GREETING -->
                  <tr>
                    <td style="background:#ffffff;padding:28px 36px 20px;">
                      <p style="margin:0;font-size:15px;color:#334155;">Hi <strong>${profile.full_name ?? 'there'}</strong>,</p>
                      <p style="margin:8px 0 0;font-size:14px;color:#64748b;line-height:1.6;">Here's your prospect activity summary. Below you'll find dormant contacts that need outreach and any outstanding to-do items requiring your attention.</p>
                    </td>
                  </tr>

                  <!-- STATS BAR -->
                  <tr>
                    <td style="background:#ffffff;padding:0 36px 24px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          ${userDormant.length > 0 ? `
                          <td width="50%" style="padding-right:8px;">
                            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;text-align:center;">
                              <div style="font-size:28px;font-weight:800;color:#ea580c;">${userDormant.length}</div>
                              <div style="font-size:12px;color:#9a3412;font-weight:600;margin-top:2px;">Dormant Prospects</div>
                            </div>
                          </td>` : ''}
                          ${totalTasks > 0 ? `
                          <td width="50%" style="padding-left:8px;">
                            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;text-align:center;">
                              <div style="font-size:28px;font-weight:800;color:#16a34a;">${totalTasks}</div>
                              <div style="font-size:12px;color:#15803d;font-weight:600;margin-top:2px;">Outstanding Tasks</div>
                            </div>
                          </td>` : ''}
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- DIVIDER -->
                  <tr><td style="background:#ffffff;padding:0 36px;"><div style="border-top:1px solid #e8edf2;"></div></td></tr>

                  <!-- CONTENT SECTIONS -->
                  <tr>
                    <td style="background:#ffffff;padding:24px 36px 32px;">
                      ${tasksSection}
                      ${dormantSection}
                    </td>
                  </tr>

                  <!-- FOOTER -->
                  <tr>
                    <td style="background:#f8fafc;border-top:1px solid #e8edf2;border-radius:0 0 12px 12px;padding:20px 36px;text-align:center;">
                      <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                        This digest is sent automatically every Monday & Thursday at 8:00 AM MST.<br>
                        Log in to ClearView to update contacts, complete tasks, or schedule follow-ups.
                      </p>
                    </td>
                  </tr>

                </table>
              </td></tr>
            </table>
          </body>
          </html>
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
            subject: `📋 Prospects Digest — ${subjectParts.join(' & ')}`,
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
