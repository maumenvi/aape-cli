export const mcp = {
  name: 'default-mcp',
  description: 'Default MCP server entry used by the runtime bootstrap.',
  execute: async (input: Record<string, unknown> = {}) => ({
    ok: true,
    name: 'default-mcp',
    status: 'ready',
    input,
  }),
};
