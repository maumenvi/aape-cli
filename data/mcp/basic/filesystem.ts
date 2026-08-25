export const mcp = {
  name: 'filesystem',
  description: 'Filesystem MCP for safe local file access and directory operations.',
  execute: async (input: Record<string, unknown> = {}) => ({
    ok: true,
    name: 'filesystem',
    status: 'ready',
    capabilities: ['read', 'write', 'list'],
    input,
  }),
};
