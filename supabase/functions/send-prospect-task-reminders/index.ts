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

    // Fetch tasks that need reminders — include full prospect contact info
    const { data: tasks, error: tasksError } = await supabase
      .from('prospect_tasks')
      .select(`
        id,
        title,
        notes,
        due_date,
        created_by,
        assigned_to,
        prospect_id,
        prospects (
          name,
          company,
          email,
          phone,
          prospect_type,
          status
        )
      `)
      .lte('reminder_at', new Date().toISOString())
      .eq('reminder_sent', false)
      .eq('completed', false);

    if (tasksError) throw tasksError;
    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sent = 0;
    const errors: string[] = [];

    for (const task of tasks) {
      try {
        // Use assigned_to user if set, otherwise fall back to created_by
        const recipientUserId = task.assigned_to || task.created_by;
        const isAssigned = !!task.assigned_to && task.assigned_to !== task.created_by;

        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', recipientUserId)
          .maybeSingle();

        if (!profile?.email) continue;

        const prospect = (task.prospects as any) ?? {};
        const prospectName = prospect.name ?? 'Unknown Prospect';
        const today = new Date().toLocaleDateString('en-CA', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        });

        const dueDateStr = task.due_date
          ? new Date(task.due_date).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
          : null;

        const isOverdue = task.due_date && new Date(task.due_date) < new Date();

        // ---- Prospect contact card ----
        const contactRows = [
          prospect.company ? `<tr><td style="padding:8px 12px;font-size:12px;font-weight:600;color:#94a3b8;white-space:nowrap;text-transform:uppercase;letter-spacing:0.05em;">Company</td><td style="padding:8px 12px;font-size:14px;color:#334155;">${prospect.company}</td></tr>` : '',
          prospect.email ? `<tr><td style="padding:8px 12px;font-size:12px;font-weight:600;color:#94a3b8;white-space:nowrap;text-transform:uppercase;letter-spacing:0.05em;">Email</td><td style="padding:8px 12px;font-size:14px;"><a href="mailto:${prospect.email}" style="color:#3b82f6;text-decoration:none;">${prospect.email}</a></td></tr>` : '',
          prospect.phone ? `<tr><td style="padding:8px 12px;font-size:12px;font-weight:600;color:#94a3b8;white-space:nowrap;text-transform:uppercase;letter-spacing:0.05em;">Phone</td><td style="padding:8px 12px;font-size:14px;"><a href="tel:${prospect.phone}" style="color:#3b82f6;text-decoration:none;">${prospect.phone}</a></td></tr>` : '',
          prospect.prospect_type ? `<tr><td style="padding:8px 12px;font-size:12px;font-weight:600;color:#94a3b8;white-space:nowrap;text-transform:uppercase;letter-spacing:0.05em;">Type</td><td style="padding:8px 12px;font-size:14px;color:#334155;">${prospect.prospect_type}</td></tr>` : '',
        ].filter(Boolean).join('');

        const subjectPrefix = isAssigned ? "\u{1F4CB} You've been assigned a task" : "\u{1F4CB} Task Reminder";
        const greetingLine = isAssigned
          ? `You have been assigned a task by a teammate that needs your attention.`
          : `You have a task coming up that needs your attention.`;

        const emailBody = `
          <!DOCTYPE html>
          <html>
          <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
              <tr><td align="center">
                <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

                  <!-- HEADER -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);border-radius:12px 12px 0 0;padding:28px 32px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td>
                            <div style="font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#64748b;margin-bottom:4px;">ClearView Partners</div>
                            <div style="font-size:22px;font-weight:700;color:#ffffff;line-height:1.2;">${isAssigned ? 'Task Assigned to You' : 'Task Reminder'}</div>
                            <div style="font-size:12px;color:#94a3b8;margin-top:4px;">${today}</div>
                          </td>
                          <td align="right" style="vertical-align:top;">
                            <div style="background:rgba(255,255,255,0.08);border-radius:10px;padding:10px 14px;text-align:center;display:inline-block;">
                              <div style="font-size:22px;">📋</div>
                              <div style="font-size:10px;color:#94a3b8;margin-top:2px;white-space:nowrap;">To-Do</div>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- GREETING -->
                  <tr>
                    <td style="background:#ffffff;padding:24px 32px 16px;">
                      <p style="margin:0;font-size:15px;color:#334155;">Hi <strong>${profile.full_name ?? 'there'}</strong>,</p>
                      <p style="margin:8px 0 0;font-size:14px;color:#64748b;line-height:1.6;">${greetingLine}</p>
                    </td>
                  </tr>

                  <!-- TASK CARD -->
                  <tr>
                    <td style="background:#ffffff;padding:0 32px 24px;">
                      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid ${isOverdue ? '#ef4444' : '#3b82f6'};border-radius:8px;padding:20px;">
                        <div style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:8px;">${task.title}</div>
                        ${task.notes ? `<div style="font-size:13px;color:#64748b;margin-bottom:12px;line-height:1.5;">${task.notes}</div>` : ''}
                        ${dueDateStr ? `
                        <div style="display:inline-block;background:${isOverdue ? '#fef2f2' : '#eff6ff'};border:1px solid ${isOverdue ? '#fecaca' : '#bfdbfe'};border-radius:20px;padding:4px 12px;">
                          <span style="font-size:12px;font-weight:600;color:${isOverdue ? '#dc2626' : '#2563eb'};">
                            ${isOverdue ? '⚠ Overdue · ' : '📅 Due '}${dueDateStr}
                          </span>
                        </div>` : ''}
                      </div>
                    </td>
                  </tr>

                  <!-- DIVIDER -->
                  <tr><td style="background:#ffffff;padding:0 32px;"><div style="border-top:1px solid #e8edf2;"></div></td></tr>

                  <!-- PROSPECT CARD -->
                  <tr>
                    <td style="background:#ffffff;padding:20px 32px 28px;">
                      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                        <div style="background:#eff6ff;border-radius:6px;padding:6px;display:inline-block;">
                          <span style="font-size:16px;">👤</span>
                        </div>
                        <div>
                          <div style="font-size:13px;font-weight:700;color:#0f172a;">${prospectName}</div>
                          <div style="font-size:11px;color:#94a3b8;">Prospect Contact</div>
                        </div>
                        ${prospect.prospect_type ? `<span style="margin-left:auto;background:#f1f5f9;color:#475569;font-size:11px;font-weight:600;padding:3px 8px;border-radius:20px;">${prospect.prospect_type}</span>` : ''}
                      </div>
                      ${contactRows ? `
                      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8edf2;border-radius:8px;overflow:hidden;">
                        ${contactRows}
                      </table>` : `<p style="margin:0;font-size:13px;color:#94a3b8;">No contact details on file.</p>`}
                    </td>
                  </tr>

                  <!-- FOOTER -->
                  <tr>
                    <td style="background:#f8fafc;border-top:1px solid #e8edf2;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center;">
                      <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                        Log in to ClearView to complete this task or update the prospect record.
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
            subject: `${subjectPrefix}: ${task.title} — ${prospectName}`,
            html: emailBody,
          }),
        });

        if (res.ok) {
          await supabase
            .from('prospect_tasks')
            .update({ reminder_sent: true })
            .eq('id', task.id);
          sent++;
        } else {
          const err = await res.text();
          errors.push(`Task ${task.id}: ${err}`);
        }
      } catch (err) {
        errors.push(`Task ${task.id}: ${err}`);
      }
    }

    return new Response(
      JSON.stringify({ sent, errors: errors.length > 0 ? errors : undefined }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Error in send-prospect-task-reminders:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
