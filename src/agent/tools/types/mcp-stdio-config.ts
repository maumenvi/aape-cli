/** MCP server configuration for stdio transports. */
export interface MCPStdioConfig {
  transport?: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
}
