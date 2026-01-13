import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const htmlHeaders = {
  "Content-Type": "text/html; charset=utf-8",
  "Cross-Origin-Opener-Policy": "unsafe-none",
  "Cross-Origin-Embedder-Policy": "unsafe-none",
};

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    console.log("OAuth callback received, code present:", !!code, "error:", error);

    if (error) {
      console.error("OAuth error:", error);
      return new Response(getErrorHtml("OAuth authorization was denied", null), {
        headers: htmlHeaders,
      });
    }

    if (!code || !state) {
      console.error("Missing code or state");
      return new Response(getErrorHtml("Missing authorization code", null), {
        headers: htmlHeaders,
      });
    }

    // Decode state to get orgId and returnTo
    let userId: string;
    let orgId: string;
    let returnTo: string | null = null;

    try {
      const stateData = JSON.parse(atob(state));
      userId = stateData.userId;
      orgId = stateData.orgId;
      returnTo = typeof stateData.returnTo === "string" ? stateData.returnTo : null;
      console.log("Decoded state - userId:", userId, "orgId:", orgId, "returnTo:", returnTo);
    } catch (e) {
      console.error("Failed to decode state:", e);
      return new Response(getErrorHtml("Invalid state parameter", null), {
        headers: htmlHeaders,
      });
    }

    if (!orgId) {
      return new Response(getErrorHtml("Missing organization ID", returnTo), {
        headers: htmlHeaders,
      });
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-sheets-callback`;

    if (!clientId || !clientSecret) {
      console.error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
      return new Response(getErrorHtml("OAuth not configured on server", returnTo), {
        headers: htmlHeaders,
      });
    }

    // Exchange code for tokens
    console.log("Exchanging code for tokens...");
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("Token exchange error:", tokenData);
      return new Response(
        getErrorHtml(`Token exchange failed: ${tokenData.error_description || tokenData.error}`, returnTo),
        { headers: htmlHeaders },
      );
    }

    console.log("Token exchange successful, storing tokens in org_integrations...");

    // Store tokens using service role (bypasses RLS)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // Upsert into org_integrations
    const { error: upsertError } = await supabase.from("org_integrations").upsert(
      {
        org_id: orgId,
        google_access_token: tokenData.access_token,
        google_refresh_token: tokenData.refresh_token || null,
        google_token_expiry: expiresAt,
        updated_by: userId,
      },
      { onConflict: "org_id" },
    );

    if (upsertError) {
      console.error("Failed to store tokens:", upsertError);
      return new Response(getErrorHtml("Failed to store authorization", returnTo), {
        headers: htmlHeaders,
      });
    }

    console.log("Tokens stored successfully for org:", orgId);

    return new Response(getSuccessHtml(returnTo), { headers: htmlHeaders });
  } catch (error: unknown) {
    console.error("Error in google-sheets-callback:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(getErrorHtml(message, null), { headers: htmlHeaders });
  }
});

function resolveReturnTo(returnTo: string | null): string {
  if (returnTo && returnTo.startsWith("http")) {
    return returnTo;
  }
  const publicSiteUrl = Deno.env.get("PUBLIC_SITE_URL");
  if (publicSiteUrl && publicSiteUrl.startsWith("http")) {
    return publicSiteUrl;
  }
  console.warn("No valid returnTo or PUBLIC_SITE_URL found, using fallback");
  return "https://avail-artisan.lovable.app";
}

function getSuccessHtml(returnTo: string | null): string {
  const baseUrl = resolveReturnTo(returnTo);
  const target = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}google_oauth=success`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Authorization Successful</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="1;url=${target}" />
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
    .container { text-align: center; padding: 2rem; }
    .icon { font-size: 4rem; margin-bottom: 1rem; color: #16a34a; }
    h1 { color: #16a34a; margin-bottom: 0.5rem; }
    p { color: #64748b; }
    a { color: #0f172a; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#10003;</div>
    <h1>Connected</h1>
    <p>Returning to the app...</p>
    <p style="margin-top: 1rem; font-size: 0.875rem;">
      <a href="${target}">Click here if you are not redirected</a>
    </p>
  </div>
  <script>
    (function() {
      var target = ${JSON.stringify(target)};
      try { window.location.replace(target); } catch (e) {}
    })();
  </script>
</body>
</html>`;
}

function getErrorHtml(message: string, returnTo: string | null): string {
  const baseUrl = resolveReturnTo(returnTo);
  const target = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}google_oauth=error&message=${encodeURIComponent(message)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Authorization Failed</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="3;url=${target}" />
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
    .container { text-align: center; padding: 2rem; max-width: 420px; }
    .icon { font-size: 4rem; margin-bottom: 1rem; color: #dc2626; }
    h1 { color: #dc2626; margin-bottom: 0.5rem; }
    p { color: #64748b; }
    a { color: #0f172a; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#10007;</div>
    <h1>Authorization Failed</h1>
    <p>${message}</p>
    <p style="margin-top: 1rem;">
      <a href="${target}">Return to the app</a>
    </p>
  </div>
  <script>
    (function() {
      var target = ${JSON.stringify(target)};
      setTimeout(function() {
        try { window.location.replace(target); } catch (e) {}
      }, 2000);
    })();
  </script>
</body>
</html>`;
}
