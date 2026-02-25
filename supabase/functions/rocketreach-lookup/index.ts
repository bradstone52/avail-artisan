import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('ROCKETREACH_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'RocketReach API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { operation } = body;

    if (operation === 'person_lookup') {
      const { name, company, linkedin_url } = body;

      const params = new URLSearchParams();
      if (name) params.set('name', name);
      if (company) params.set('current_employer', company);
      if (linkedin_url) params.set('linkedin_url', linkedin_url);

      const rrRes = await fetch(`https://api.rocketreach.co/api/v2/lookupProfile?${params.toString()}`, {
        headers: { 'Api-Key': apiKey },
      });

      if (rrRes.status === 404) {
        return new Response(JSON.stringify({ result: null, message: 'No contact found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (rrRes.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit reached. Please try again shortly.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!rrRes.ok) {
        const errText = await rrRes.text();
        return new Response(JSON.stringify({ error: `RocketReach error: ${rrRes.status}`, detail: errText }), {
          status: rrRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const person = await rrRes.json();
      const normalized = normalizePerson(person);

      return new Response(JSON.stringify({ result: normalized }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (operation === 'people_search') {
      const { company, title, page_size = 10 } = body;

      const searchBody: Record<string, unknown> = { page_size };
      if (company) searchBody.current_employer = [company];
      if (title) searchBody.title = [title];

      const rrRes = await fetch('https://api.rocketreach.co/api/v2/searchPeople', {
        method: 'POST',
        headers: { 'Api-Key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(searchBody),
      });

      if (rrRes.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit reached. Please try again shortly.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!rrRes.ok) {
        const errText = await rrRes.text();
        return new Response(JSON.stringify({ error: `RocketReach error: ${rrRes.status}`, detail: errText }), {
          status: rrRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data2 = await rrRes.json();
      const results = (data2.profiles || data2.people || []).map(normalizePerson);

      return new Response(JSON.stringify({ results, total: data2.pagination?.total ?? results.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      return new Response(JSON.stringify({ error: 'Invalid operation' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function normalizePerson(p: Record<string, unknown>) {
  const emails = (p.emails as Array<{ email?: string; smtp_valid?: string }> | null) ?? [];
  const phones = (p.phones as Array<{ number?: string }> | null) ?? [];

  return {
    id: p.id ?? null,
    name: p.name ?? null,
    title: p.current_title ?? p.title ?? null,
    company: p.current_employer ?? p.employer ?? null,
    emails: emails.map((e) => e.email).filter(Boolean),
    phones: phones.map((ph) => ph.number).filter(Boolean),
    linkedin_url: p.linkedin_url ?? null,
    photo_url: p.profile_pic ?? null,
  };
}
