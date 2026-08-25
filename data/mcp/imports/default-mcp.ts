export const mcp = {
  name: 'default-mcp',
  description: 'Default MCP server entry used by the runtime bootstrap.',
  source: 'basic',
  installedAt: '2026-08-24T10:04:30.341Z',
  execute: async (input: Record<string, unknown> = {}) => ({
    ok: true,
    name: 'default-mcp',
    status: 'ready',
    input,
  }),
};
