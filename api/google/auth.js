const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

function appOrigin() {
  return (process.env.APP_ORIGIN || '').replace(/\/$/, '');
}

export default {
  async fetch() {
    const origin = appOrigin();
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!origin || !clientId || !process.env.GOOGLE_CLIENT_SECRET) {
      return Response.json({ error: 'Google OAuth is not configured. Add APP_ORIGIN, GOOGLE_CLIENT_ID, and GOOGLE_CLIENT_SECRET in Vercel.' }, { status: 503 });
    }
    const state = crypto.randomUUID();
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
    return new Response(null, {
      status: 302,
      headers: {
        Location: url.toString(),
        'Set-Cookie': `applyguard_oauth_state=${state}; Path=/api/google; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Priority=High`,
        'Cache-Control': 'no-store'
      }
    });
  }
};
