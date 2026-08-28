/** MCP server configuration launched through npx. */
export interface MCPNpxConfig {
  transport: 'npx';
  package: string;
  args?: string[];
  env?: Record<string, string>;
  npxArgs?: string[];
}
