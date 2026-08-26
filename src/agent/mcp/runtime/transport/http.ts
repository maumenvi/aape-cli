import { loadDotEnvFromCurrentProject } from '../../../../config/index.ts';
import type { MCPConfig, MCPHttpConfig } from '../../../tools/types.ts';
import type { JsonRpcFailure, JsonRpcNotification, JsonRpcRequest, JsonRpcSuccess } from '../protocol/json-rpc.ts';
import type { McpRequestOptions, McpTransport } from '../contracts/types.ts';

function resolveEnvPlaceholders(value: string): string {
  return value
    .replace(/\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, key: string) => {
      const resolved = process.env[key] ?? process.env[key.toUpperCase()] ?? process.env[key.toLowerCase()];
      return typeof resolved === 'string' ? resolved : '';
    })
    .replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, key: string) => {
      const resolved = process.env[key] ?? process.env[key.toUpperCase()] ?? process.env[key.toLowerCase()];
      return typeof resolved === 'string' ? resolved : '';
    });
}

function resolveHeaders(headers: Record<string, string> | undefined): Record<string, string> {
  loadDotEnvFromCurrentProject();
  return Object.fromEntries(Object.entries(headers ?? {}).map(([key, value]) => [key, resolveEnvPlaceholders(value)]));
}

function asHttpConfig(config: MCPConfig): MCPHttpConfig {
  if (config.transport !== 'http') {
    throw new Error('MCP HTTP transport requires config.transport="http".');
  }
  return config;
}

export class McpHttpTransport implements McpTransport {
  private readonly config: MCPHttpConfig;
  private readonly defaultTimeoutMs: number;
  private nextRequestId = 1;
  private open = true;

  constructor(config: MCPConfig, defaultTimeoutMs = 15_000) {
    this.config = asHttpConfig(config);
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
    const response = await this.send(payload, options.timeoutMs ?? this.defaultTimeoutMs);
    if ('error' in response) {
      const failure = response as JsonRpcFailure;
      throw new Error(`MCP error ${failure.error.code}: ${failure.error.message}`);
    }
    return (response as JsonRpcSuccess<TResult>).result;
  }

  async notify(method: string, params?: unknown): Promise<void> {
    this.ensureOpen();
    const payload: JsonRpcNotification = {
      jsonrpc: '2.0',
      method,
      ...(typeof params === 'undefined' ? {} : { params }),
    };
    await this.send(payload, this.defaultTimeoutMs, true);
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
          'content-type': 'application/json',
          ...resolveHeaders(this.config.headers),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`MCP HTTP transport failed with status ${response.status}`);
      }
      const text = await response.text();
      if (!text.trim()) {
        if (allowEmpty) {
          return { jsonrpc: '2.0', id: -1, result: {} };
        }
        throw new Error('MCP HTTP transport returned an empty response body.');
      }
      const decoded = JSON.parse(text) as JsonRpcSuccess | JsonRpcFailure;
      if (decoded.jsonrpc !== '2.0') {
        throw new Error('MCP HTTP transport returned invalid JSON-RPC payload.');
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
