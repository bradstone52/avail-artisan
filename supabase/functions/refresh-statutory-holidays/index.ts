import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function easterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function nthDayOfMonth(year: number, month: number, dayOfWeek: number, n: number): Date {
  const first = new Date(year, month, 1);
  let diff = (dayOfWeek - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + diff + (n - 1) * 7);
}

function mondayBeforeMay25(year: number): Date {
  const may25 = new Date(year, 4, 25);
  const dow = may25.getDay();
  const diff = dow === 0 ? 6 : dow - 1;
  return new Date(year, 4, 25 - diff);
}

function getAlbertaHolidays(year: number): { date: string; name: string }[] {
  const easter = easterDate(year);
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);

  return [
    { date: fmt(new Date(year, 0, 1)), name: "New Year's Day" },
    { date: fmt(nthDayOfMonth(year, 1, 1, 3)), name: "Family Day" },
    { date: fmt(goodFriday), name: "Good Friday" },
    { date: fmt(mondayBeforeMay25(year)), name: "Victoria Day" },
    { date: fmt(new Date(year, 6, 1)), name: "Canada Day" },
    { date: fmt(nthDayOfMonth(year, 7, 1, 1)), name: "Heritage Day" },
    { date: fmt(nthDayOfMonth(year, 8, 1, 1)), name: "Labour Day" },
    { date: fmt(nthDayOfMonth(year, 9, 1, 2)), name: "Thanksgiving" },
    { date: fmt(new Date(year, 10, 11)), name: "Remembrance Day" },
    { date: fmt(new Date(year, 11, 25)), name: "Christmas Day" },
  ];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const currentYear = new Date().getFullYear();
    const allHolidays: { holiday_date: string; name: string; jurisdiction: string }[] = [];

    for (let y = currentYear; y <= currentYear + 5; y++) {
      for (const h of getAlbertaHolidays(y)) {
        allHolidays.push({ holiday_date: h.date, name: h.name, jurisdiction: "AB" });
      }
    }

    const { error } = await supabase
      .from("statutory_holidays")
      .upsert(allHolidays, { onConflict: "holiday_date,jurisdiction" });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, count: allHolidays.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
