const PLATFORM_LINK = /https?:\/\/[^\s"'<>]+/gi;
const GENERIC_LINK = /unsubscribe|preferences|privacy|help|support|view in browser|manage alerts|login|signin/i;

function decode(value = '') { return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'); }
function headers(message) { return Object.fromEntries((message.payload?.headers || []).map(item => [item.name.toLowerCase(), item.value])); }
function partsOf(part) { return [part, ...(part?.parts || []).flatMap(partsOf)]; }
function body(part) {
  const parts = partsOf(part);
  const html = parts.find(item => item?.mimeType === 'text/html' && item.body?.data);
  const text = html || parts.find(item => item?.mimeType === 'text/plain' && item.body?.data) || parts.find(item => item?.body?.data);
  return text?.body?.data ? decode(text.body.data) : '';
}
function sourceFor(from = '', text = '') {
  const value = `${from} ${text}`.toLowerCase();
  if (value.includes('linkedin')) return 'LinkedIn alert';
  if (value.includes('naukri')) return 'Naukri alert';
  if (value.includes('iimjobs')) return 'IIMJobs alert';
  if (value.includes('instahyre')) return 'Instahyre alert';
  return 'Imported job alert';
}
function locationFor(text = '') {
  const match = text.match(/\b(bengaluru|bangalore|mumbai|gurugram|gurgaon|new delhi|delhi|hyderabad|pune|chennai|remote)\b/i);
  return match ? match[1] : 'Not specified';
}
function linksFromHtml(html = '') {
  const links = [];
  const anchors = html.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi) || [];
  for (const anchor of anchors) {
    const match = anchor.match(/href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    const url = match?.[1]?.replace(/&amp;/g, '&');
    const title = match?.[2]?.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    if (url?.startsWith('http') && title && !GENERIC_LINK.test(`${title} ${url}`)) links.push({ url, title });
  }
  if (links.length) return links;
  return (html.match(PLATFORM_LINK) || []).map(url => ({ url, title: '' })).filter(({ url }) => !GENERIC_LINK.test(url));
}

export default {
  async fetch(request) {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return Response.json({ error: 'Connect Google before importing alerts.' }, { status: 401 });
    const query = new URL(request.url).searchParams.get('q') || 'label:rolewise-jobs newer_than:14d';
    try {
      const list = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${new URLSearchParams({ q: query, maxResults: '40' })}`, { headers: { Authorization: `Bearer ${token}` } });
      const index = await list.json();
      if (!list.ok) return Response.json({ error: index.error?.message || 'Gmail could not list your alert emails.' }, { status: list.status });
      const messages = await Promise.all((index.messages || []).map(async ({ id }) => {
        const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, { headers: { Authorization: `Bearer ${token}` } });
        return response.ok ? response.json() : null;
      }));
      const jobs = messages.filter(Boolean).flatMap(message => {
        const meta = headers(message); const raw = body(message.payload); const clean = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const source = sourceFor(meta.from, `${meta.subject || ''} ${clean}`); const location = locationFor(clean);
        const links = linksFromHtml(raw).filter(link => /linkedin\.com|naukri\.com|iimjobs\.com|instahyre\.com/i.test(link.url));
        if (!links.length) return [{ id: `gmail:${message.id}`, source, title: meta.subject || 'Job alert to review', company: source.replace(' alert', ''), location, url: `https://mail.google.com/mail/u/0/#all/${message.id}`, description: clean.slice(0, 2500), postedAt: new Date(Number(message.internalDate || Date.now())).toISOString(), tags: ['email alert'], needsReview: true }];
        return links.slice(0, 12).map((link, position) => ({ id: `gmail:${message.id}:${position}`, source, title: link.title || meta.subject || 'Job alert role', company: source.replace(' alert', ''), location, url: link.url, description: clean.slice(0, 2500), postedAt: new Date(Number(message.internalDate || Date.now())).toISOString(), tags: ['email alert'] }));
      });
      return Response.json({ jobs, messagesScanned: messages.filter(Boolean).length, query }, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
      return Response.json({ error: 'Gmail could not be reached.' }, { status: 502 });
    }
  }
};
