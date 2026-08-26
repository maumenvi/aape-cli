export interface McpServerCapabilities {
  tools?: Record<string, never>;
}

export interface McpServerInfo {
  name: string;
  version: string;
}

export interface McpInitializeParams {
  protocolVersion?: string;
  clientInfo?: { name?: string; version?: string };
  capabilities?: Record<string, unknown>;
}

export interface McpToolEntry {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** which aape package owns this tool: 'mcp:<server>', 'skill:<name>', 'tool:<name>' */
  origin: string;
}
