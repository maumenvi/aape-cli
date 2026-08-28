/** MCP server configuration for streamable HTTP transports. */
export interface MCPHttpConfig {
  transport: 'http';
  url: string;
  headers?: Record<string, string>;
}
