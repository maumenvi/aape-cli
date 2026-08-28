import type { MCPConfig, MCPSseConfig } from '../../../tools/types.ts';
import {
  McpJsonRpcError,
  type JsonRpcFailure,
  type JsonRpcNotification,
  type JsonRpcRequest,
  type JsonRpcSuccess,
} from '../protocol/json-rpc.ts';
import { McpTransportError, type McpRequestOptions, type McpTransport } from '../contracts/types.ts';
import { createMcpRequestHeaders } from './shared/create-mcp-request-headers.ts';

function asSseConfig(config: MCPConfig): MCPSseConfig {
  if (config.transport !== 'sse') {
    throw new Error('MCP SSE transport requires config.transport="sse".');
  }
  return config;
}

export class McpSseTransport implements McpTransport {
  readonly kind = 'sse' as const;
  private readonly config: MCPSseConfig;
  private readonly defaultTimeoutMs: number;
  private nextRequestId = 1;
  private open = true;

  constructor(config: MCPConfig, defaultTimeoutMs = 15_000) {
    this.config = asSseConfig(config);
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  isOpen(): boolean {
    return this.open;
  }

  async request<TResult = unknown>(method: string, params?: unknown, options: McpRequestOptions = {}): Promise<TResult> {
    this.ensureOpen();
    const id = this.nextRequestId++;
    const payload: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      ...(typeof params === 'undefined' ? {} : { params }),
    };
    const response = await this.send(payload, options.timeoutMs ?? this.defaultTimeoutMs, options);
    if ('error' in response) {
      const failure = response as JsonRpcFailure;
      throw new McpJsonRpcError(failure.error.code, failure.error.message, failure.error.data);
    }
    return (response as JsonRpcSuccess<TResult>).result;
  }

  async notify(method: string, params?: unknown, options: McpRequestOptions = {}): Promise<void> {
    this.ensureOpen();
    const payload: JsonRpcNotification = {
      jsonrpc: '2.0',
      method,
      ...(typeof params === 'undefined' ? {} : { params }),
    };
    await this.send(payload, this.defaultTimeoutMs, options, true);
  }

  async close(): Promise<void> {
    this.open = false;
  }

  private ensureOpen(): void {
    if (!this.open) {
      throw new Error('MCP transport is closed.');
    }
  }

  private async send(
    payload: JsonRpcRequest | JsonRpcNotification,
    timeoutMs: number,
    options: McpRequestOptions,
    allowEmpty = false,
  ): Promise<JsonRpcSuccess | JsonRpcFailure> {
    const controller = new AbortController();
    const timer = timeoutMs > 0
      ? setTimeout(() => controller.abort(new Error(`MCP request timed out after ${timeoutMs}ms`)), timeoutMs)
      : undefined;
    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          ...(this.config.headers ?? {}),
          ...createMcpRequestHeaders(payload.method, payload.params, options),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const text = await response.text();
      if (!response.ok) {
        if (text.trim()) {
          try {
            const decoded = parseSseOrJson(text);
            if (decoded.jsonrpc === '2.0' && 'error' in decoded) {
              return decoded;
            }
          } catch {
            // The response is intentionally classified as an unstructured transport failure below.
          }
        }
        throw new McpTransportError(
          `MCP SSE transport failed with status ${response.status}`,
          response.status,
          false,
        );
      }
      if (!text.trim()) {
        if (allowEmpty) {
          return { jsonrpc: '2.0', id: -1, result: {} };
        }
        throw new Error('MCP SSE transport returned an empty response body.');
      }
      const decoded = parseSseOrJson(text);
      if (decoded.jsonrpc !== '2.0') {
        throw new Error('MCP SSE transport returned invalid JSON-RPC payload.');
      }
      return decoded;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`MCP request timed out after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

function parseSseOrJson(payload: string): JsonRpcSuccess | JsonRpcFailure {
  const trimmed = payload.trim();
  if (trimmed.startsWith('{')) {
    return JSON.parse(trimmed) as JsonRpcSuccess | JsonRpcFailure;
  }
  const chunks = trimmed.split(/\n\n+/);
  for (const chunk of chunks) {
    const dataLines = chunk
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim());
    if (dataLines.length === 0) continue;
    const data = dataLines.join('\n');
    if (!data) continue;
    return JSON.parse(data) as JsonRpcSuccess | JsonRpcFailure;
  }
  throw new Error('MCP SSE transport did not receive an SSE data payload.');
}
