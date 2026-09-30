const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

function appOrigin() {
  return (process.env.APP_ORIGIN || '').replace(/\/$/, '');
}
function trustedAppOrigin(value, fallback) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return fallback;
    if (url.origin === fallback || /^https:\/\/rolewise-[a-z0-9]+-alternateprerna-gmailcoms-projects\.vercel\.app$/i.test(url.origin)) return url.origin;
  } catch { /* use the configured origin */ }
  return fallback;
}

export default {
  async fetch(request) {
    const origin = appOrigin();
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!origin || !clientId || !process.env.GOOGLE_CLIENT_SECRET) {
      return Response.json({ error: 'Google OAuth is not configured. Add APP_ORIGIN, GOOGLE_CLIENT_ID, and GOOGLE_CLIENT_SECRET in Vercel.' }, { status: 503 });
    }
    const state = crypto.randomUUID();
    const parentOrigin = trustedAppOrigin(new URL(request.url).searchParams.get('parent_origin') || origin, origin);
    const redirectUri = `${origin}/api/google/callback`;
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: GOOGLE_SCOPE,
      access_type: 'online',
      include_granted_scopes: 'true',
      prompt: 'consent',
      state
    }).toString();
    const headers = new Headers({ Location: url.toString(), 'Cache-Control': 'no-store' });
    headers.append('Set-Cookie', `rolewise_oauth_state=${state}; Path=/api/google; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Priority=High`);
    headers.append('Set-Cookie', `rolewise_oauth_parent=${encodeURIComponent(parentOrigin)}; Path=/api/google; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Priority=High`);
    return new Response(null, { status: 302, headers });
  }
};
