import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Json = Record<string, unknown>;

async function jsonResponse(body: Json, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const authedClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: userData, error: userErr } = await authedClient.auth.getUser();
    if (userErr || !userData?.user) {
      return jsonResponse({ error: "Invalid session" }, 401);
    }

    const requesterId = userData.user.id;
    const { data: isAdmin, error: adminErr } = await adminClient.rpc("is_admin", {
      _user_id: requesterId,
    });

    if (adminErr) {
      console.error("[reset-user-mfa] is_admin rpc error:", adminErr);
      return jsonResponse({ error: "Failed to authorize request" }, 500);
    }

    if (!isAdmin) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const emailRaw = typeof body.email === "string" ? body.email : "";
    const email = emailRaw.trim().toLowerCase();
    const debug = body?.debug === true;
    if (!email) {
      return jsonResponse({ error: "email is required" }, 400);
    }

    // Find user by email (Auth admin API)
    let targetUserId: string | null = null;
    let page = 1;
    const perPage = 200;
    for (let i = 0; i < 50; i++) {
      const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error("[reset-user-mfa] listUsers error:", error);
        return jsonResponse({ error: "Failed to look up user" }, 500);
      }

      const match = data.users.find((u) => (u.email || "").toLowerCase() === email);
      if (match?.id) {
        targetUserId = match.id;
        break;
      }

      if (data.users.length < perPage) break;
      page++;
    }

    if (!targetUserId) {
      return jsonResponse({ error: "User not found" }, 404);
    }

    const authAdminHeaders = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    };

    // List factors for target user
    const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${targetUserId}/factors`, {
      method: "GET",
      headers: authAdminHeaders,
    });

    if (!listRes.ok) {
      const text = await listRes.text().catch(() => "");
      console.error("[reset-user-mfa] list factors failed:", listRes.status, text);
      return jsonResponse({ error: "Failed to list MFA factors" }, 500);
    }

    const factorsPayload = (await listRes.json().catch(() => ({}))) as {
      factors?: Array<{ id: string; factor_type?: string; status?: string; friendly_name?: string }>;
    };

    const factors = Array.isArray(factorsPayload.factors) ? factorsPayload.factors : [];

    if (debug) {
      return jsonResponse({ success: true, message: "Debug: listed MFA factors", targetUserId, factors });
    }

    if (factors.length === 0) {
      return jsonResponse({ success: true, message: "No MFA factors to reset", removed: 0 });
    }

    // Delete all factors
    let removed = 0;
    const errors: Array<{ factorId: string; status: number; body: string }> = [];
    for (const f of factors) {
      if (!f?.id) continue;

      const delRes = await fetch(
        `${supabaseUrl}/auth/v1/admin/users/${targetUserId}/factors/${f.id}`,
        {
          method: "DELETE",
          headers: authAdminHeaders,
        },
      );

      if (delRes.ok) {
        removed++;
      } else {
        const text = await delRes.text().catch(() => "");
        errors.push({ factorId: f.id, status: delRes.status, body: text });
      }
    }

    if (errors.length > 0) {
      console.error("[reset-user-mfa] delete factor errors:", errors);
      return jsonResponse(
        {
          error: "Some MFA factors could not be removed",
          removed,
          failed: errors,
        },
        500,
      );
    }

    return jsonResponse({ success: true, message: "MFA reset complete", removed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[reset-user-mfa] error:", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
