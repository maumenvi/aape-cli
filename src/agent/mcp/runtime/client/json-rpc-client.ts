import type { McpClient, McpRequestOptions, McpTransport } from '../contracts/types.ts';
import { negotiateMcpProtocolVersion, type McpCallToolResult, type McpInitializeResult, type McpListToolsResult } from '../protocol/json-rpc.ts';

export class JsonRpcMcpClient implements McpClient {
  private readonly transport: McpTransport;
  private initialized = false;

  constructor(transport: McpTransport) {
    this.transport = transport;
  }

  async initialize(options: McpRequestOptions = {}): Promise<McpInitializeResult> {
    const requestedVersion = negotiateMcpProtocolVersion();
    const result = await this.transport.request<McpInitializeResult>('initialize', {
      protocolVersion: requestedVersion,
      capabilities: {},
      clientInfo: {
        name: 'maia',
        version: '1.5.2',
      },
    }, options);
    await this.transport.notify('notifications/initialized', {});
    this.initialized = true;
    return {
      ...result,
      protocolVersion: negotiateMcpProtocolVersion(result?.protocolVersion ?? requestedVersion),
    };
  }

  async listTools(options: McpRequestOptions = {}): Promise<McpListToolsResult> {
    await this.ensureInitialized(options);
    const result = await this.transport.request<McpListToolsResult>('tools/list', {}, options);
    return {
      tools: Array.isArray(result.tools) ? result.tools : [],
    };
  }

  async callTool(name: string, args: Record<string, unknown> = {}, options: McpRequestOptions = {}): Promise<McpCallToolResult> {
    await this.ensureInitialized(options);
    return this.transport.request<McpCallToolResult>('tools/call', {
      name,
      arguments: args,
    }, options);
  }

  async shutdown(options: McpRequestOptions = {}): Promise<void> {
    if (!this.initialized) return;
    await this.transport.request('shutdown', {}, options);
    await this.transport.notify('exit', {});
    this.initialized = false;
  }

  private async ensureInitialized(options: McpRequestOptions): Promise<void> {
    if (this.initialized) return;
    await this.initialize(options);
  }
}

export function createJsonRpcMcpClient(transport: McpTransport): JsonRpcMcpClient {
  return new JsonRpcMcpClient(transport);
}
