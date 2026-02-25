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

    // Fetch tasks that need reminders
    const { data: tasks, error: tasksError } = await supabase
      .from('prospect_tasks')
      .select(`
        id,
        title,
        notes,
        due_date,
        created_by,
        prospect_id,
        prospects (name)
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
        // Get creator's email from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', task.created_by)
          .maybeSingle();

        if (!profile?.email) continue;

        const prospectName = (task.prospects as any)?.name ?? 'Unknown Prospect';
        const dueDateStr = task.due_date
          ? new Date(task.due_date).toLocaleDateString('en-CA', { dateStyle: 'medium' })
          : null;

        const emailBody = `
          <p>Hi ${profile.full_name ?? ''},</p>
          <p>This is a reminder for your task:</p>
          <table style="border-collapse:collapse;width:100%;margin:16px 0">
            <tr>
              <td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;background:#f8fafc">Task</td>
              <td style="padding:8px;border:1px solid #e2e8f0">${task.title}</td>
            </tr>
            <tr>
              <td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;background:#f8fafc">Prospect</td>
              <td style="padding:8px;border:1px solid #e2e8f0">${prospectName}</td>
            </tr>
            ${dueDateStr ? `<tr>
              <td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;background:#f8fafc">Due</td>
              <td style="padding:8px;border:1px solid #e2e8f0">${dueDateStr}</td>
            </tr>` : ''}
            ${task.notes ? `<tr>
              <td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;background:#f8fafc">Notes</td>
              <td style="padding:8px;border:1px solid #e2e8f0">${task.notes}</td>
            </tr>` : ''}
          </table>
          <p style="color:#6b7280;font-size:14px">Log in to mark this task complete.</p>
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
            subject: `Reminder: ${task.title} — ${prospectName}`,
            html: emailBody,
          }),
        });

        if (res.ok) {
          // Mark reminder as sent
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
