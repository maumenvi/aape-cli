export const mcp = {
  name: 'github',
  description: 'GitHub MCP for repository metadata, issues, and pull request workflows.',
  execute: async (input: Record<string, unknown> = {}) => ({
    ok: true,
    name: 'github',
    status: 'ready',
    capabilities: ['issues', 'pull_requests', 'repo_metadata'],
    input,
  }),
};
