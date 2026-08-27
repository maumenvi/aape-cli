export interface JsonRpcRequest<TParams = unknown> {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: TParams;
}

export interface JsonRpcNotification<TParams = unknown> {
  jsonrpc: '2.0';
  method: string;
  params?: TParams;
}

export interface JsonRpcSuccess<TResult = unknown> {
  jsonrpc: '2.0';
  id: number;
  result: TResult;
}

export interface JsonRpcFailure {
  jsonrpc: '2.0';
  id: number;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export type JsonRpcResponse<TResult = unknown> = JsonRpcSuccess<TResult> | JsonRpcFailure;

export interface McpToolDescriptor {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpListToolsResult {
  tools: McpToolDescriptor[];
}

export interface McpCallToolResult {
  content?: Array<{ type: string; text?: string; [key: string]: unknown }>;
  isError?: boolean;
  [key: string]: unknown;
}

export const MCP_PROTOCOL_VERSIONS = ['2025-06-18', '2024-11-05'] as const;

export type McpProtocolVersion = (typeof MCP_PROTOCOL_VERSIONS)[number];

export function negotiateMcpProtocolVersion(requestedVersion?: string): McpProtocolVersion {
  if (requestedVersion && MCP_PROTOCOL_VERSIONS.includes(requestedVersion as McpProtocolVersion)) {
    return requestedVersion as McpProtocolVersion;
  }

  return MCP_PROTOCOL_VERSIONS[0];
}

export interface McpInitializeResult {
  protocolVersion?: string;
  serverInfo?: { name?: string; version?: string };
  capabilities?: Record<string, unknown>;
}
