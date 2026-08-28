
/** Describes the agent mcp server config contract. */
export interface AgentMcpServerConfig {
  command: string;
  args: string[];
  /** Working directory passed to the spawned process */
  cwd?: string;
}
