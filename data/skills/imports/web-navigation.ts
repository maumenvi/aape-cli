export const skill = {
  name: 'web_navigation',
  description: 'Navigates the public web and reads URLs or page summaries.',
  usesTools: ['fetch_url', 'search_web'],
  source: 'basic',
  installedAt: '2026-08-24T10:04:30.341Z',
  execute: async (input: Record<string, unknown> = {}) => {
    const url = typeof input.url === 'string' ? input.url : '';
    if (!url) {
      throw new Error('A URL is required.');
    }
    const response = await fetch(url, {
      headers: { Accept: 'text/html, text/plain, application/json' },
    });
    const html = await response.text();
    const content = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return {
      ok: response.ok,
      name: 'web_navigation',
      url,
      status: response.status,
      statusText: response.statusText,
      content: content.slice(0, 4000),
    };
  },
};
