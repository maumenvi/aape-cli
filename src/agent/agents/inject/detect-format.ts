import type { AgentConfigFormat } from './agent-config-format.ts';

/** Detect which config schema the target agent expects. */
export function detectFormat(agentId: string): AgentConfigFormat {
  if (agentId === 'zed') return 'zed-settings';
  if (agentId === 'codex') return 'toml-mcp-servers';
  if (agentId === 'claude' || agentId === 'continue') return 'mcp-servers';
  return 'servers';
}
