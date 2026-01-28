import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Json = Record<string, unknown>;

function jsonResponse(body: Json, status = 200) {
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
    let userFactors: Array<{ id: string; factor_type?: string; status?: string; friendly_name?: string }> = [];
    
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
        // Extract factors from user object if available
        const maybeFactors = (match as any)?.factors;
        if (Array.isArray(maybeFactors)) {
          userFactors = maybeFactors;
        }
        break;
      }

      if (data.users.length < perPage) break;
      page++;
    }

    if (!targetUserId) {
      return jsonResponse({ error: "User not found" }, 404);
    }

    // If no factors found on the user object, try listing via admin SDK
    if (userFactors.length === 0) {
      const { data: factorsData, error: factorsError } = await adminClient.auth.admin.mfa.listFactors({
        userId: targetUserId,
      });
      
      if (factorsError) {
        console.error("[reset-user-mfa] listFactors SDK error:", factorsError);
        // Don't fail - just proceed with empty factors from user object
      } else if (factorsData?.factors && Array.isArray(factorsData.factors)) {
        userFactors = factorsData.factors;
      }
    }

    if (debug) {
      return jsonResponse({
        success: true,
        message: "Debug: listed MFA factors",
        targetUserId,
        factors: userFactors,
      });
    }

    if (userFactors.length === 0) {
      return jsonResponse({ success: true, message: "No MFA factors to reset", removed: 0 });
    }

    // Delete all factors using SDK
    let removed = 0;
    const errors: Array<{ factorId: string; message: string }> = [];
    
    for (const f of userFactors) {
      if (!f?.id) continue;

      const { error: deleteError } = await adminClient.auth.admin.mfa.deleteFactor({
        userId: targetUserId,
        id: f.id,
      });

      if (deleteError) {
        errors.push({ factorId: f.id, message: deleteError.message });
      } else {
        removed++;
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
