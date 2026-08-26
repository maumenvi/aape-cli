import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { loadDotEnvFromCurrentProject } from '../../../../config/index.ts';
import type { MCPConfig, MCPStdioConfig } from '../../../tools/types.ts';
import type { McpRequestOptions, McpTransport } from '../contracts/types.ts';
import { encodeMcpMessage, McpMessageDecoder } from '../protocol/framing.ts';
import type { JsonRpcFailure, JsonRpcNotification, JsonRpcRequest, JsonRpcResponse, JsonRpcSuccess } from '../protocol/json-rpc.ts';

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

function resolveRuntimeEnv(env: Record<string, string> | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(env ?? {})) {
    result[key] = resolveEnvPlaceholders(value);
  }
  return result;
}

interface PendingRequest {
  resolve(value: unknown): void;
  reject(error: unknown): void;
  timer?: NodeJS.Timeout;
}

export class McpStdioTransport implements McpTransport {
  private readonly config: MCPStdioConfig;
  private readonly defaultTimeoutMs: number;
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly decoder = new McpMessageDecoder();
  private readonly pending = new Map<number, PendingRequest>();
  private nextRequestId = 1;
  private open = true;

  constructor(config: MCPConfig, defaultTimeoutMs = 15_000) {
    this.config = asStdioConfig(config);
    this.defaultTimeoutMs = defaultTimeoutMs;
    loadDotEnvFromCurrentProject();
    const runtimeEnv = resolveRuntimeEnv(this.config.env);
    this.child = spawn(this.config.command, this.config.args ?? [], {
      stdio: 'pipe',
      env: {
        ...process.env,
        ...runtimeEnv,
      },
    });

    this.child.stdout.on('data', (chunk: Buffer) => this.onStdout(chunk));
    this.child.stderr.on('data', () => undefined);
    this.child.on('error', (err) => this.failAllPending(err));
    this.child.on('exit', (code, signal) => {
      const reason = new Error(`MCP process exited (code=${code ?? 'null'}, signal=${signal ?? 'null'})`);
      this.open = false;
      this.failAllPending(reason);
    });
  }

  isOpen(): boolean {
    return this.open;
  }

  async request<TResult = unknown>(method: string, params?: unknown, options: McpRequestOptions = {}): Promise<TResult> {
    this.ensureOpen();
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

    this.child.stdin.write(encodeMcpMessage(request));
    return responsePromise;
  }

  async notify(method: string, params?: unknown): Promise<void> {
    this.ensureOpen();
    const notification: JsonRpcNotification = {
      jsonrpc: '2.0',
      method,
      ...(typeof params === 'undefined' ? {} : { params }),
    };
    this.child.stdin.write(encodeMcpMessage(notification));
  }

  async close(): Promise<void> {
    if (!this.open) return;
    this.open = false;
    this.child.stdin.end();
    this.child.kill('SIGTERM');
  }

  private onStdout(chunk: Buffer): void {
    const messages = this.decoder.push(chunk);
    for (const message of messages) {
      const response = message as JsonRpcResponse;
      if (typeof response !== 'object' || !response || typeof (response as { id?: unknown }).id !== 'number') {
        continue;
      }
      const pending = this.pending.get(response.id);
      if (!pending) {
        continue;
      }
      this.pending.delete(response.id);
      if (pending.timer) {
        clearTimeout(pending.timer);
      }

      if ('error' in response) {
        const error = response as JsonRpcFailure;
        pending.reject(new Error(`MCP error ${error.error.code}: ${error.error.message}`));
      } else {
        pending.resolve((response as JsonRpcSuccess).result);
      }
    }
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

function asStdioConfig(config: MCPConfig): MCPStdioConfig {
  if (config.transport === 'http' || config.transport === 'npx' || config.transport === 'sse' || config.transport === 'ws') {
    throw new Error('MCP stdio transport cannot be created with non-stdio config.');
  }
  if (!config.command) {
    throw new Error('MCP stdio transport requires "command".');
  }
  return config;
}
