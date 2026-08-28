import type { MCPConfig, MCPWebSocketConfig } from '../../../tools/types.ts';
import type { JsonRpcNotification, JsonRpcRequest, JsonRpcSuccess } from '../protocol/json-rpc.ts';
import type { McpRequestOptions, McpTransport } from '../contracts/types.ts';
import { McpJsonRpcError } from '../protocol/json-rpc.ts';
import { isJsonRpcFailure, isJsonRpcResponse } from '../protocol/validation/index.ts';

interface PendingRequest {
  resolve(value: unknown): void;
  reject(error: unknown): void;
  timer?: NodeJS.Timeout;
}

type WebSocketCtor = new (url: string) => {
  readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: 'open' | 'message' | 'error' | 'close', listener: (event: unknown) => void): void;
};

export class McpWebSocketTransport implements McpTransport {
  readonly kind = 'ws' as const;
  private readonly config: MCPWebSocketConfig;
  private readonly defaultTimeoutMs: number;
  private readonly socket: ReturnType<typeof this.createSocket>;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly openPromise: Promise<void>;
  private nextRequestId = 1;
  private open = true;

  constructor(config: MCPConfig, defaultTimeoutMs = 15_000) {
    this.config = asWebSocketConfig(config);
    this.defaultTimeoutMs = defaultTimeoutMs;
    this.socket = this.createSocket(this.config.url);
    this.openPromise = this.awaitOpen();
  }

  isOpen(): boolean {
    return this.open;
  }

  async request<TResult = unknown>(method: string, params?: unknown, options: McpRequestOptions = {}): Promise<TResult> {
    this.ensureOpen();
    await this.openPromise;
    const id = this.nextRequestId++;
    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      ...(typeof params === 'undefined' ? {} : { params }),
    };

    const responsePromise = new Promise<TResult>((resolve, reject) => {
      const pendingRequest: PendingRequest = {
        resolve: resolve as PendingRequest['resolve'],
        reject,
      };
      if (timeoutMs > 0) {
        pendingRequest.timer = setTimeout(() => {
          this.pending.delete(id);
          reject(new Error(`MCP request timed out for method "${method}" after ${timeoutMs}ms`));
        }, timeoutMs);
      }
      this.pending.set(id, pendingRequest);
    });

    this.socket.send(JSON.stringify(request));
    return responsePromise;
  }

  async notify(method: string, params?: unknown): Promise<void> {
    this.ensureOpen();
    await this.openPromise;
    const notification: JsonRpcNotification = {
      jsonrpc: '2.0',
      method,
      ...(typeof params === 'undefined' ? {} : { params }),
    };
    this.socket.send(JSON.stringify(notification));
  }

  async close(): Promise<void> {
    if (!this.open) return;
    this.open = false;
    this.socket.close();
    this.failAllPending(new Error('MCP transport is closed.'));
  }

  private createSocket(url: string) {
    const ctor = (globalThis as unknown as { WebSocket?: WebSocketCtor }).WebSocket;
    if (!ctor) {
      throw new Error('WebSocket API is not available in this runtime.');
    }
    const socket = new ctor(url);
    socket.addEventListener('message', (event) => this.onMessage(event));
    socket.addEventListener('error', () => this.failAllPending(new Error('MCP WebSocket transport encountered an error.')));
    socket.addEventListener('close', () => {
      this.open = false;
      this.failAllPending(new Error('MCP WebSocket connection closed.'));
    });
    return socket;
  }

  private awaitOpen(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.addEventListener('open', () => resolve());
      this.socket.addEventListener('error', () => reject(new Error('Failed to open MCP WebSocket connection.')));
    });
  }

  private onMessage(event: unknown): void {
    const data = getEventData(event);
    if (!data) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch (err) {
      console.error('Failed to parse MCP WebSocket message:', data, err);
      return;
    }
    if (!isJsonRpcResponse(parsed) || typeof parsed.id !== 'number') {
      return;
    }
    const responseId = parsed.id;
    const pending = this.pending.get(responseId);
    if (!pending) return;
    this.pending.delete(responseId);
    if (pending.timer) clearTimeout(pending.timer);
    if (isJsonRpcFailure(parsed)) {
      pending.reject(new McpJsonRpcError(parsed.error.code, parsed.error.message, parsed.error.data));
      return;
    }
    pending.resolve((parsed as JsonRpcSuccess).result);
  }

  private ensureOpen(): void {
    if (!this.open) {
      throw new Error('MCP transport is closed.');
    }
  }

  private failAllPending(error: unknown): void {
    for (const [id, pending] of this.pending) {
      if (pending.timer) clearTimeout(pending.timer);
      pending.reject(error);
      this.pending.delete(id);
    }
  }
}

function asWebSocketConfig(config: MCPConfig): MCPWebSocketConfig {
  if (config.transport !== 'ws') {
    throw new Error('MCP WebSocket transport requires config.transport="ws".');
  }
  if (!config.url) {
    throw new Error('MCP WebSocket transport requires "url".');
  }
  return config;
}

function getEventData(event: unknown): string | null {
  if (!event || typeof event !== 'object') return null;
  const value = (event as { data?: unknown }).data;
  if (typeof value === 'string') return value;
  return null;
}
