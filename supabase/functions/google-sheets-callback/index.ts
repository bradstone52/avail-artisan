import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const htmlHeaders = {
  // ✅ fix weird character encoding (âœ“)
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

    // Decode state to get user ID + return URL
    let userId: string;
    let returnTo: string | null = null;

    try {
      const stateData = JSON.parse(atob(state));
      userId = stateData.userId;
      returnTo = typeof stateData.returnTo === "string" ? stateData.returnTo : null;
      console.log("Decoded user ID from state:", userId, "returnTo:", returnTo);
    } catch (e) {
      console.error("Failed to decode state:", e);
      return new Response(getErrorHtml("Invalid state parameter", null), {
        headers: htmlHeaders,
      });
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-sheets-callback`;

    // Exchange code for tokens
    console.log("Exchanging code for tokens...");
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
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

    console.log("Token exchange successful, storing tokens...");

    // Store tokens using service role
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    const { error: upsertError } = await supabase.from("google_oauth_tokens").upsert(
      {
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token, // may be undefined sometimes; OK
        expires_at: expiresAt,
        scope: tokenData.scope,
      },
      { onConflict: "user_id" },
    );

    if (upsertError) {
      console.error("Failed to store tokens:", upsertError);
      return new Response(getErrorHtml("Failed to store authorization", returnTo), {
        headers: htmlHeaders,
      });
    }

    console.log("Tokens stored successfully for user:", userId);

    return new Response(getSuccessHtml(returnTo), { headers: htmlHeaders });
  } catch (error: unknown) {
    console.error("Error in google-sheets-callback:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(getErrorHtml(message, null), { headers: htmlHeaders });
  }
});

function resolveReturnTo(returnTo: string | null): string | null {
  // Prefer state returnTo, fallback to env
  const envFallback = Deno.env.get("PUBLIC_SITE_URL") || Deno.env.get("SITE_URL") || Deno.env.get("APP_URL") || null;

  const candidate = returnTo && returnTo.startsWith("http") ? returnTo : envFallback;
  return candidate && candidate.startsWith("http") ? candidate : null;
}

function getSuccessHtml(returnTo: string | null): string {
  const safeReturnTo = resolveReturnTo(returnTo);
  const target = safeReturnTo ? `${safeReturnTo}${safeReturnTo.includes("?") ? "&" : "?"}google_oauth=success` : null;

  return `<!DOCTYPE html>
<html>
<head>
  <title>Authorization Successful</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
    .container { text-align: center; padding: 2rem; }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { color: #16a34a; margin-bottom: 0.5rem; }
    p { color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✓</div>
    <h1>Connected</h1>
    <p>Returning to the app…</p>
    ${target ? "" : '<p style="margin-top:10px;color:#64748b;">You can close this tab.</p>'}
  </div>
  <script>
    const target = ${JSON.stringify(target)};
    if (target) window.location.replace(target);
  </script>
</body>
</html>`;
}

function getErrorHtml(message: string, returnTo: string | null): string {
  const safeReturnTo = resolveReturnTo(returnTo);
  const target = safeReturnTo
    ? `${safeReturnTo}${safeReturnTo.includes("?") ? "&" : "?"}google_oauth=error&message=${encodeURIComponent(message)}`
    : null;

  return `<!DOCTYPE html>
<html>
<head>
  <title>Authorization Failed</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
    .container { text-align: center; padding: 2rem; max-width: 420px; }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { color: #dc2626; margin-bottom: 0.5rem; }
    p { color: #64748b; }
    a { color: #0f172a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✕</div>
    <h1>Authorization Failed</h1>
    <p>${message}</p>
    ${target ? `<p><a href="${target}">Return to the app</a></p>` : ""}
  </div>
  <script>
    const target = ${JSON.stringify(target)};
    if (target) window.location.replace(target);
  </script>
</body>
</html>`;
}
