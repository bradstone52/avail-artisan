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

    // Helper: fetch full contact details for a person ID
    async function lookupById(id: number | string): Promise<Record<string, unknown> | null> {
      const res = await fetch(`https://api.rocketreach.co/v2/api/lookupProfile?id=${id}`, {
        method: 'GET',
        headers: { 'Api-Key': apiKey! },
      });
      if (!res.ok) return null;
      return await res.json();
    }

    if (operation === 'person_lookup') {
      const { name, company, linkedin_url } = body;

      const query: Record<string, unknown> = {};
      if (name) query.name = [name];
      if (company) query.current_employer = [company];
      if (linkedin_url) query.linkedin_url = [linkedin_url];

      const rrRes = await fetch('https://api.rocketreach.co/v2/api/search', {
        method: 'POST',
        headers: { 'Api-Key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, page_size: 1 }),
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

      const searchData = await rrRes.json();
      const profiles = searchData.profiles || searchData.people || [];

      if (profiles.length === 0) {
        return new Response(JSON.stringify({ result: null, message: 'No contact found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Try to get full contact details using the profile ID
      const profile = profiles[0];
      let fullProfile: Record<string, unknown> | null = null;
      if (profile.id) {
        fullProfile = await lookupById(profile.id);
      }

      const normalized = normalizePerson(fullProfile ?? profile);

      return new Response(JSON.stringify({ result: normalized }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (operation === 'people_search') {
      const { company, title, name, page = 1, page_size = 25 } = body;

      const query: Record<string, unknown> = {};
      if (company) query.current_employer = [company];
      if (title) query.title = [title];
      if (name) query.name = [name];

      if (Object.keys(query).length === 0) {
        return new Response(JSON.stringify({ error: 'At least one search parameter (company, title, or name) is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const rrRes = await fetch('https://api.rocketreach.co/v2/api/search', {
        method: 'POST',
        headers: { 'Api-Key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, page_size, start: (page - 1) * page_size + 1 }),
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

      const searchData2 = await rrRes.json();
      const profiles2 = searchData2.profiles || searchData2.results || [];
      const total = searchData2.pagination?.total ?? searchData2.total ?? profiles2.length;

      // Fetch full profiles in parallel to get emails/phones
      const fullProfiles = await Promise.all(
        profiles2.map(async (p: Record<string, unknown>) => {
          if (p.id) {
            const full = await lookupById(p.id);
            return full ?? p;
          }
          return p;
        })
      );

      const results = fullProfiles.map(normalizePerson);

      return new Response(JSON.stringify({ results, total, page, page_size }), {
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
