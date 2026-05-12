// Requires RESEND_API_KEY set via: supabase secrets set RESEND_API_KEY=re_xxxx

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SharedExpense {
  id: string;
  description: string;
  amount: number | null;
  paid_by: string;
  expense_date: string;
  notes: string | null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: expenses, error } = await supabase
      .from('shared_expenses')
      .select('id, description, amount, paid_by, expense_date, notes')
      .eq('settled', false)
      .order('expense_date', { ascending: true });

    if (error) throw error;

    const rows = (expenses ?? []) as SharedExpense[];

    const bradExpenses = rows.filter((e) => e.paid_by === 'Brad Stone');
    const dougExpenses = rows.filter((e) => e.paid_by === 'Doug Johannson');

    const bradPaid = bradExpenses.reduce((s, e) => s + (e.amount ?? 0), 0);
    const dougPaid = dougExpenses.reduce((s, e) => s + (e.amount ?? 0), 0);

    const net = bradPaid / 2 - dougPaid / 2; // positive = doug owes brad, negative = brad owes doug

    const verdict =
      Math.abs(net) < 0.01
        ? 'All square — no balance owing.'
        : net > 0
        ? `Doug owes Brad ${formatCurrency(net)}`
        : `Brad owes Doug ${formatCurrency(-net)}`;

    const expenseRows = (group: SharedExpense[]) =>
      group
        .map(
          (e) =>
            `<tr>
              <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${formatDate(e.expense_date)}</td>
              <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${e.description}${e.notes ? ` <span style="color:#6b7280;font-size:12px">(${e.notes})</span>` : ''}</td>
              <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${e.amount != null ? formatCurrency(e.amount) : '—'}</td>
            </tr>`,
        )
        .join('');

    const expenseRowsText = (group: SharedExpense[]) =>
      group
        .map(
          (e) =>
            `  ${formatDate(e.expense_date)}  ${e.description}${e.notes ? ` (${e.notes})` : ''}  ${e.amount != null ? formatCurrency(e.amount) : '—'}`,
        )
        .join('\n');

    const tableStyle =
      'width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px';
    const thStyle =
      'padding:8px 12px;text-align:left;background:#f3f4f6;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#374151';

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1a1a1a;padding:24px">
  <h1 style="font-size:22px;font-weight:700;margin-bottom:4px">Shared Expenses Summary</h1>
  <p style="color:#6b7280;font-size:14px;margin-top:0">ClearView Commercial Realty — Open (unsettled) expenses as of ${new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-bottom:28px">
    <div style="display:flex;gap:32px;margin-bottom:12px;flex-wrap:wrap">
      <div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;margin-bottom:2px">Brad paid (open)</div>
        <div style="font-size:20px;font-weight:700;color:#1d4ed8">${formatCurrency(bradPaid)}</div>
      </div>
      <div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;margin-bottom:2px">Doug paid (open)</div>
        <div style="font-size:20px;font-weight:700;color:#7c3aed">${formatCurrency(dougPaid)}</div>
      </div>
    </div>
    <div style="font-size:16px;font-weight:600;color:${Math.abs(net) < 0.01 ? '#15803d' : '#92400e'};border-top:1px solid #e5e7eb;padding-top:12px">
      ${verdict}
    </div>
  </div>

  ${bradExpenses.length > 0 ? `
  <h2 style="font-size:15px;font-weight:600;margin-bottom:8px">Brad Stone paid (${bradExpenses.length} expense${bradExpenses.length !== 1 ? 's' : ''})</h2>
  <table style="${tableStyle}">
    <thead><tr>
      <th style="${thStyle}">Date</th>
      <th style="${thStyle}">Description</th>
      <th style="${thStyle};text-align:right">Amount</th>
    </tr></thead>
    <tbody>${expenseRows(bradExpenses)}</tbody>
    <tfoot><tr>
      <td colspan="2" style="padding:8px 12px;font-weight:600">Total</td>
      <td style="padding:8px 12px;font-weight:600;text-align:right">${formatCurrency(bradPaid)}</td>
    </tr></tfoot>
  </table>
  ` : ''}

  ${dougExpenses.length > 0 ? `
  <h2 style="font-size:15px;font-weight:600;margin-bottom:8px">Doug Johannson paid (${dougExpenses.length} expense${dougExpenses.length !== 1 ? 's' : ''})</h2>
  <table style="${tableStyle}">
    <thead><tr>
      <th style="${thStyle}">Date</th>
      <th style="${thStyle}">Description</th>
      <th style="${thStyle};text-align:right">Amount</th>
    </tr></thead>
    <tbody>${expenseRows(dougExpenses)}</tbody>
    <tfoot><tr>
      <td colspan="2" style="padding:8px 12px;font-weight:600">Total</td>
      <td style="padding:8px 12px;font-weight:600;text-align:right">${formatCurrency(dougPaid)}</td>
    </tr></tfoot>
  </table>
  ` : ''}

  <p style="font-size:12px;color:#9ca3af;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px">
    Sent from ClearView CRE · logistics-space.net
  </p>
</body>
</html>`;

    const text = `SHARED EXPENSES SUMMARY
ClearView Commercial Realty — Open expenses as of ${new Date().toLocaleDateString('en-CA')}

Brad paid (open): ${formatCurrency(bradPaid)}
Doug paid (open): ${formatCurrency(dougPaid)}
Net verdict: ${verdict}

${bradExpenses.length > 0 ? `BRAD STONE PAID (${bradExpenses.length} expenses)\n${expenseRowsText(bradExpenses)}\nTotal: ${formatCurrency(bradPaid)}\n` : ''}
${dougExpenses.length > 0 ? `DOUG JOHANNSON PAID (${dougExpenses.length} expenses)\n${expenseRowsText(dougExpenses)}\nTotal: ${formatCurrency(dougPaid)}\n` : ''}

Total open expenses: ${rows.length}`;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ClearView CRE <noreply@logistics-space.net>',
        to: ['brad@cvpartners.ca', 'doug@cvpartners.ca'],
        subject: `Shared Expenses Summary — ${verdict}`,
        html,
        text,
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.text();
      throw new Error(`Resend error: ${err}`);
    }

    return new Response(
      JSON.stringify({ ok: true, expenseCount: rows.length, verdict }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
