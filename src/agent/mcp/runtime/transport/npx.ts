import type { MCPConfig, MCPNpxConfig, MCPStdioConfig } from '../../../tools/types.ts';
import type { McpRequestOptions, McpTransport } from '../contracts/types.ts';
import { McpStdioTransport } from './stdio.ts';

export class McpNpxTransport implements McpTransport {
  readonly kind = 'npx' as const;
  private readonly stdioTransport: McpStdioTransport;

  constructor(config: MCPConfig, defaultTimeoutMs = 15_000) {
    const npxConfig = asNpxConfig(config);
    const stdioConfig: MCPStdioConfig = {
      transport: 'stdio',
      command: 'npx',
      args: [...(npxConfig.npxArgs ?? ['-y']), npxConfig.package, ...(npxConfig.args ?? [])],
      env: npxConfig.env,
    };
    this.stdioTransport = new McpStdioTransport(stdioConfig, defaultTimeoutMs);
  }

  isOpen(): boolean {
    return this.stdioTransport.isOpen();
  }

  request<TResult = unknown>(method: string, params?: unknown, options?: McpRequestOptions): Promise<TResult> {
    return this.stdioTransport.request<TResult>(method, params, options);
  }

  notify(method: string, params?: unknown): Promise<void> {
    return this.stdioTransport.notify(method, params);
  }

  close(): Promise<void> {
    return this.stdioTransport.close();
  }
}

function asNpxConfig(config: MCPConfig): MCPNpxConfig {
  if (config.transport !== 'npx') {
    throw new Error('MCP npx transport requires config.transport="npx".');
  }
  if (!config.package) {
    throw new Error('MCP npx transport requires "package".');
  }
  return config;
}
