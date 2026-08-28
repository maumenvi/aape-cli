/** MCP server configuration for WebSocket transports. */
export interface MCPWebSocketConfig {
  transport: 'ws';
  url: string;
  headers?: Record<string, string>;
}
