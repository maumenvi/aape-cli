import type { McpRequestOptions } from './mcp-request-options.ts';
import type { McpTransportKind } from './mcp-transport-kind.ts';

/** Provides request, notification, and lifecycle operations over an MCP wire transport. */
export interface McpTransport {
  readonly kind?: McpTransportKind;
  request<TResult = unknown>(method: string, params?: unknown, options?: McpRequestOptions): Promise<TResult>;
  notify(method: string, params?: unknown, options?: McpRequestOptions): Promise<void>;
  close(): Promise<void>;
  isOpen(): boolean;
}

