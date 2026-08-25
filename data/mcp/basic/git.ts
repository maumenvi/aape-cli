export const mcp = {
  name: 'git',
  description: 'Git MCP for repository status, logs, and commit-oriented workflows.',
  execute: async (input: Record<string, unknown> = {}) => ({
    ok: true,
    name: 'git',
    status: 'ready',
    capabilities: ['status', 'log', 'diff', 'commit'],
    input,
  }),
};
