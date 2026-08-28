import type { AgentMcpServerConfig } from './agent-mcp-server-config.ts';

/** MCP server entry injected into an agent config file. */
export interface AgentMcpEntry {
  /** Key used in the target config file's "servers" object */
  key: string;
  /** The stdio command config injected into the agent's MCP config */
  config: AgentMcpServerConfig;
}
