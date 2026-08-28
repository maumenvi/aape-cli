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

export const MCP_PROTOCOL_ERA = 'legacy' as const;

export type McpProtocolVersion = (typeof MCP_PROTOCOL_VERSIONS)[number];

export function isSupportedMcpProtocolVersion(version: unknown): version is McpProtocolVersion {
  return typeof version === 'string' && MCP_PROTOCOL_VERSIONS.includes(version as McpProtocolVersion);
}

export function assertSupportedMcpProtocolVersion(version: unknown): McpProtocolVersion {
  if (isSupportedMcpProtocolVersion(version)) {
    return version;
  }

  const rendered = typeof version === 'string' ? `"${version}"` : 'an omitted protocol version';
  throw new Error(
    `Unsupported MCP protocol version ${rendered}. `
    + `Maia currently supports only the legacy initialize/initialized era (${MCP_PROTOCOL_VERSIONS.join(', ')}); `
    + 'the stateless 2026-07-28 era is not yet supported.',
  );
}

export function negotiateMcpProtocolVersion(requestedVersion?: string): McpProtocolVersion {
  if (isSupportedMcpProtocolVersion(requestedVersion)) {
    return requestedVersion;
  }

  return MCP_PROTOCOL_VERSIONS[0];
}

export interface McpInitializeResult {
  protocolVersion?: string;
  serverInfo?: { name?: string; version?: string };
  capabilities?: Record<string, unknown>;
}
