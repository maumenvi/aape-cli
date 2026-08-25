export const skill = {
  name: 'discovery',
  description: 'Discovers tools, skills and MCP entries from local registry and remote repositories.',
  usesTools: ['read_file', 'search_web'],
  execute: async () => ({ ok: true, name: 'discovery' }),
};
