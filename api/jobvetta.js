export default {
  async fetch(request) {
    const apiKey = process.env.JOBVETTA_API_KEY;
    if (!apiKey) return Response.json({ error: 'JOBVETTA_API_KEY is not configured in Vercel.' }, { status: 503 });
    const requestUrl = new URL(request.url);
    const location = requestUrl.searchParams.get('location') || 'Bengaluru';
    const upstream = new URL('https://api.jobvetta.com/v1/jobs');
    upstream.searchParams.set('q', 'product manager');
    upstream.searchParams.set('location', location);
    upstream.searchParams.set('days', '7');
    upstream.searchParams.set('limit', '10');
    try {
      const response = await fetch(upstream, { headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' } });
      const body = await response.json();
      if (!response.ok) return Response.json({ error: body.error || `Jobvetta returned ${response.status}` }, { status: response.status });
      return Response.json({ jobs: body.jobs || [] }, { headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate=3600' } });
    } catch {
      return Response.json({ error: 'Jobvetta could not be reached.' }, { status: 502 });
    }
  }
};
