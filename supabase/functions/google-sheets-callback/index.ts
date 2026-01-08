import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    console.log('OAuth callback received, code present:', !!code, 'error:', error);

    if (error) {
      console.error('OAuth error:', error);
      return new Response(getErrorHtml('OAuth authorization was denied'), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    if (!code || !state) {
      console.error('Missing code or state');
      return new Response(getErrorHtml('Missing authorization code'), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Decode state to get user ID
    let userId: string;
    try {
      const stateData = JSON.parse(atob(state));
      userId = stateData.userId;
      console.log('Decoded user ID from state:', userId);
    } catch (e) {
      console.error('Failed to decode state:', e);
      return new Response(getErrorHtml('Invalid state parameter'), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-sheets-callback`;

    // Exchange code for tokens
    console.log('Exchanging code for tokens...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      console.error('Token exchange error:', tokenData);
      return new Response(getErrorHtml(`Token exchange failed: ${tokenData.error_description || tokenData.error}`), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    console.log('Token exchange successful, storing tokens...');

    // Store tokens using service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

    // Upsert tokens
    const { error: upsertError } = await supabase
      .from('google_oauth_tokens')
      .upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        scope: tokenData.scope,
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Failed to store tokens:', upsertError);
      return new Response(getErrorHtml('Failed to store authorization'), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    console.log('Tokens stored successfully for user:', userId);

    // Return success HTML that closes the popup
    return new Response(getSuccessHtml(), {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error: unknown) {
    console.error('Error in google-sheets-callback:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(getErrorHtml(message), {
      headers: { 'Content-Type': 'text/html' },
    });
  }
});

function getSuccessHtml(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Authorization Successful</title>
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
    <h1>Connected!</h1>
    <p>Google Sheets authorization successful. This window will close automatically.</p>
  </div>
  <script>
    setTimeout(() => {
      if (window.opener) {
        window.opener.postMessage({ type: 'google-oauth-success' }, '*');
      }
      window.close();
    }, 1500);
  </script>
</body>
</html>`;
}

function getErrorHtml(message: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Authorization Failed</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
    .container { text-align: center; padding: 2rem; max-width: 400px; }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { color: #dc2626; margin-bottom: 0.5rem; }
    p { color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✕</div>
    <h1>Authorization Failed</h1>
    <p>${message}</p>
    <p><a href="javascript:window.close()">Close this window</a></p>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'google-oauth-error', error: '${message}' }, '*');
    }
  </script>
</body>
</html>`;
}
