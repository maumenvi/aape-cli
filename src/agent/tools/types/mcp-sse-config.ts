/** MCP server configuration for server-sent event transports. */
export interface MCPSseConfig {
  transport: 'sse';
  url: string;
  headers?: Record<string, string>;
}
