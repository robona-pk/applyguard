function cookie(request, name) {
  const value = request.headers.get('cookie') || '';
  return value.split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1) || '';
}

function trustedAppOrigin(value, fallback) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return fallback;
    if (url.origin === fallback || /^https:\/\/applyguard-[a-z0-9]+-alternateprerna-gmailcoms-projects\.vercel\.app$/i.test(url.origin)) return url.origin;
  } catch { /* use the configured origin */ }
  return fallback;
}

function page(message, payload = {}, targetOrigin = (process.env.APP_ORIGIN || '').replace(/\/$/, '')) {
  const data = JSON.stringify({ type: 'applyguard-google-auth', ...payload }).replace(/</g, '\\u003c');
  const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  headers.append('Set-Cookie', 'applyguard_oauth_state=; Path=/api/google; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  headers.append('Set-Cookie', 'applyguard_oauth_parent=; Path=/api/google; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  return new Response(`<!doctype html><title>FindAMatch</title><p>${message}</p><script>const result=${data};const target=${JSON.stringify(targetOrigin)};try{localStorage.setItem('applyguard.googleAuthResult',JSON.stringify(result));setTimeout(()=>localStorage.removeItem('applyguard.googleAuthResult'),15000)}catch{}try{window.opener&&window.opener.postMessage(result,target)}catch{}try{new BroadcastChannel('applyguard-google-auth').postMessage(result)}catch{}setTimeout(()=>window.close(),700)</script>`, { headers });
}

export default {
  async fetch(request) {
    const origin = (process.env.APP_ORIGIN || '').replace(/\/$/, '');
    const url = new URL(request.url);
    const state = url.searchParams.get('state') || '';
    const code = url.searchParams.get('code');
    const parentOrigin = trustedAppOrigin(decodeURIComponent(cookie(request, 'applyguard_oauth_parent') || origin), origin);
    if (!origin || !code || !state || state !== cookie(request, 'applyguard_oauth_state')) return page('Google connection could not be verified. Please close this window and try again.', { error: 'OAuth state validation failed.' }, parentOrigin);
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
      if (!response.ok || !tokens.access_token) return page('Google did not return an access token. Please try again.', { error: tokens.error_description || tokens.error || 'Token exchange failed.' }, parentOrigin);
      return page('Connected. You can close this window.', { accessToken: tokens.access_token, expiresIn: Number(tokens.expires_in || 3600) }, parentOrigin);
    } catch {
      return page('Google could not be reached. Please try again.', { error: 'Token exchange failed.' }, parentOrigin);
    }
  }
};
