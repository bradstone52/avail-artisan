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
        if (userDormant.length > 0) {
          const rows = userDormant.map((p: any) => {
            const daysSince = p.last_contacted_at
              ? Math.floor((Date.now() - new Date(p.last_contacted_at).getTime()) / 86400000)
              : null;
            const daysSinceStr = daysSince !== null ? `${daysSince} days ago` : 'Never';
            const followUpStr = p.follow_up_date
              ? new Date(p.follow_up_date).toLocaleDateString('en-CA', { dateStyle: 'medium' })
              : '—';
            return `
              <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${p.name}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${p.company ?? '—'}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${p.prospect_type ?? '—'}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${daysSinceStr}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${followUpStr}</td>
              </tr>
            `;
          }).join('');

          dormantSection = `
            <h3 style="color:#1f2937;margin-top:32px;">🕐 Dormant Prospects (No contact in 14+ days)</h3>
            <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px;">
              <thead>
                <tr style="background:#f3f4f6;">
                  <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Name</th>
                  <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Company</th>
                  <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Type</th>
                  <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Last Contacted</th>
                  <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Follow-up Date</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          `;
        }

        // ---- Section 2: Outstanding Tasks ----
        let tasksSection = '';
        if (userTaskGroups.length > 0) {
          const totalTasks = userTaskGroups.reduce((sum, g) => sum + g.tasks.length, 0);
          const taskRows = userTaskGroups.map(({ prospect, tasks }) => {
            const taskItems = tasks.map((t: any) => {
              const dueDateStr = t.due_date
                ? new Date(t.due_date).toLocaleDateString('en-CA', { dateStyle: 'medium' })
                : '—';
              const isOverdue = t.due_date && new Date(t.due_date) < new Date();
              const overdueStyle = isOverdue ? 'color:#dc2626;font-weight:600;' : '';
              return `
                <tr>
                  <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;padding-left:32px;color:#6b7280;font-style:italic;">${prospect.name}${prospect.company ? ` <span style="color:#9ca3af;">(${prospect.company})</span>` : ''}</td>
                  <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${t.title}</td>
                  <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;${overdueStyle}">${isOverdue ? '⚠ ' : ''}${dueDateStr}</td>
                  <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">${t.notes ?? '—'}</td>
                </tr>
              `;
            }).join('');
            return taskItems;
          }).join('');

          tasksSection = `
            <h3 style="color:#1f2937;margin-top:32px;">✅ Outstanding To-Do Items (${totalTasks} task${totalTasks !== 1 ? 's' : ''})</h3>
            <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px;">
              <thead>
                <tr style="background:#f3f4f6;">
                  <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Prospect</th>
                  <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Task</th>
                  <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Due Date</th>
                  <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Notes</th>
                </tr>
              </thead>
              <tbody>${taskRows}</tbody>
            </table>
          `;
        }

        const totalTasks = userTaskGroups.reduce((sum, g) => sum + g.tasks.length, 0);
        const subjectParts = [];
        if (userDormant.length > 0) subjectParts.push(`${userDormant.length} dormant prospect${userDormant.length !== 1 ? 's' : ''}`);
        if (totalTasks > 0) subjectParts.push(`${totalTasks} outstanding task${totalTasks !== 1 ? 's' : ''}`);

        const emailBody = `
          <div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;">
            <h2 style="color:#1f2937;">📋 Prospects Digest</h2>
            <p style="color:#374151;font-size:15px;">Hi ${profile.full_name ?? ''},</p>
            <p style="color:#374151;font-size:15px;">Here's your prospect activity summary:</p>
            ${dormantSection}
            ${tasksSection}
            <p style="color:#6b7280;font-size:12px;margin-top:32px;">
              This is an automated digest from ClearView. Log in to update contact dates, complete tasks, or schedule follow-ups.
            </p>
          </div>
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
