function decode(value = '') {
  return value.replace(/^<!\[CDATA\[|\]\]>$/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
}
function tag(item, name) {
  const match = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return match ? decode(match[1].trim()) : '';
}
export default {
  async fetch() {
    try {
      const response = await fetch('https://startup.jobs/feeds/jobs?role=product');
      if (!response.ok) return Response.json({ error: `Startup Jobs returned ${response.status}` }, { status: response.status });
      const xml = await response.text();
      const items = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
      const jobs = items.map((item, index) => ({
        id: `startupjobs:${tag(item, 'guid') || tag(item, 'link') || index}`,
        title: tag(item, 'title'), company: 'Startup Jobs', location: 'Not specified',
        url: tag(item, 'link'), description: tag(item, 'description'), postedAt: tag(item, 'pubDate'), tags: ['startup']
      }));
      return Response.json({ jobs }, { headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate=3600' } });
    } catch {
      return Response.json({ error: 'Startup Jobs could not be reached.' }, { status: 502 });
    }
  }
};
