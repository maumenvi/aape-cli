import type { MCPConfig } from '../../../tools/types.ts';
import type { McpCallToolResult, McpInitializeResult, McpListToolsResult } from '../protocol/json-rpc.ts';

export interface McpRequestOptions {
  timeoutMs?: number;
}

export interface McpTransport {
  request<TResult = unknown>(method: string, params?: unknown, options?: McpRequestOptions): Promise<TResult>;
  notify(method: string, params?: unknown): Promise<void>;
  close(): Promise<void>;
  isOpen(): boolean;
}

export interface McpClient {
  initialize(options?: McpRequestOptions): Promise<McpInitializeResult>;
  listTools(options?: McpRequestOptions): Promise<McpListToolsResult>;
  callTool(name: string, args?: Record<string, unknown>, options?: McpRequestOptions): Promise<McpCallToolResult>;
  shutdown(options?: McpRequestOptions): Promise<void>;
}

export type McpSessionStatus = 'starting' | 'running' | 'stopped' | 'failed';

export interface McpSession {
  serverName: string;
  config: MCPConfig;
  status: McpSessionStatus;
  startedAt: number;
  lastHealthcheckAt?: number;
  lastError?: string;
  client: McpClient;
  transport: McpTransport;
}
