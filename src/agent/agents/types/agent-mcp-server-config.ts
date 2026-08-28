/** Command configuration used to launch an agent MCP server. */
export interface AgentMcpServerConfig {
  command: string;
  args: string[];
  /** Working directory passed to the spawned process */
  cwd?: string;
}
