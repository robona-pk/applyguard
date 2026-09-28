function cookie(request, name) {
  const value = request.headers.get('cookie') || '';
  return value.split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1) || '';
}

function page(message, payload = {}) {
  const data = JSON.stringify({ type: 'applyguard-google-auth', ...payload }).replace(/</g, '\\u003c');
  return new Response(`<!doctype html><title>ApplyGuard</title><p>${message}</p><script>window.opener&&window.opener.postMessage(${data}, ${JSON.stringify((process.env.APP_ORIGIN || '').replace(/\/$/, ''))});window.close();</script>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Set-Cookie': 'applyguard_oauth_state=; Path=/api/google; HttpOnly; Secure; SameSite=Lax; Max-Age=0' }
  });
}

export default {
  async fetch(request) {
    const origin = (process.env.APP_ORIGIN || '').replace(/\/$/, '');
    const url = new URL(request.url);
    const state = url.searchParams.get('state') || '';
    const code = url.searchParams.get('code');
    if (!origin || !code || !state || state !== cookie(request, 'applyguard_oauth_state')) return page('Google connection could not be verified. Please close this window and try again.', { error: 'OAuth state validation failed.' });
    try {
      const body = new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: `${origin}/api/google/callback`,
        grant_type: 'authorization_code'
      });
      const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
      const tokens = await response.json();
      if (!response.ok || !tokens.access_token) return page('Google did not return an access token. Please try again.', { error: tokens.error_description || tokens.error || 'Token exchange failed.' });
      return page('Connected. You can close this window.', { accessToken: tokens.access_token, expiresIn: Number(tokens.expires_in || 3600) });
    } catch {
      return page('Google could not be reached. Please try again.', { error: 'Token exchange failed.' });
    }
  }
};
