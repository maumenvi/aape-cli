function validateUrl(url: string): boolean {
  // Default: block all network access (require explicit LLM policy configuration)
  return false;
}

export const tool = {
  name: 'fetch_url',
  description: 'Fetches a URL over HTTP for analysis.',
  inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
  execute: async (input: Record<string, unknown> = {}) => {
    const url = typeof input.url === 'string' ? input.url : '';
    if (!url) {
      throw new Error('A URL is required.');
    }

    if (!validateUrl(url)) {
      throw new Error(`Network access blocked by default policy. Configure LLM access policy to enable.`);
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
