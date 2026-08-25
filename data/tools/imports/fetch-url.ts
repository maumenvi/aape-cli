export const tool = {
  name: 'fetch_url',
  description: 'Fetches a URL over HTTP for analysis.',
  inputSchema: {
    type: 'object',
    properties: {
      url: { type: 'string' },
    },
    required: ['url'],
  },
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
    const content = await response.text();
    return {
      ok: response.ok,
      name: 'fetch_url',
      url,
      status: response.status,
      statusText: response.statusText,
      content: content.slice(0, 4000),
    };
  },
};
