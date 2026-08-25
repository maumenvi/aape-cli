export const mcp = {
  name: 'sqlite',
  description: 'SQLite MCP for local structured data access and query execution.',
  execute: async (input: Record<string, unknown> = {}) => ({
    ok: true,
    name: 'sqlite',
    status: 'ready',
    capabilities: ['query', 'schema', 'rows'],
    input,
  }),
};
