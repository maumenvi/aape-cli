import { createInterface } from 'node:readline';
import type { AgentCatalogStore } from '../../catalog/store.ts';
import { AgentMcpManager } from '../manager/index.ts';
import type { JsonRpcRequest, JsonRpcResponse } from '../runtime/protocol/json-rpc.ts';
import { collectAllTools } from './collect.ts';
import { routeToolCall } from './router.ts';
import type { McpInitializeParams, McpToolEntry } from './types.ts';

const PROTOCOL_VERSION = '2024-11-05';

export interface McpStdioServerOptions {
  name?: string;
  version?: string;
  /** Re-discover tools on every tools/list request (default: false). */
  dynamicDiscovery?: boolean;
}

export class McpStdioServer {
  private readonly catalog: AgentCatalogStore;
  private readonly mcpManager: AgentMcpManager;
  private readonly serverName: string;
  private readonly serverVersion: string;
  private readonly dynamicDiscovery: boolean;
  private cachedTools: McpToolEntry[] = [];

  constructor(catalog: AgentCatalogStore, options: McpStdioServerOptions = {}) {
    this.catalog = catalog;
    this.mcpManager = new AgentMcpManager(catalog);
    this.serverName = options.name ?? 'maia-mcp-server';
    this.serverVersion = options.version ?? '1.0.0';
    this.dynamicDiscovery = options.dynamicDiscovery ?? false;
  }

  async start(): Promise<void> {
    // Pre-warm tool cache
    this.cachedTools = await collectAllTools(this.catalog, this.mcpManager);

    const rl = createInterface({ input: process.stdin, terminal: false });

    rl.on('line', async (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      let request: JsonRpcRequest;
      try {
        request = JSON.parse(trimmed) as JsonRpcRequest;
      } catch {
        this.send({ jsonrpc: '2.0', id: 0, error: { code: -32700, message: 'Parse error' } });
        return;
      }

      const response = await this.handle(request);
      if (response !== null) {
        this.send(response);
      }
    });

    rl.on('close', async () => {
      await this.mcpManager.shutdownAll();
      process.exit(0);
    });
  }

  private send(payload: JsonRpcResponse): void {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
  }

  private async handle(request: JsonRpcRequest): Promise<JsonRpcResponse | null> {
    const { id, method, params } = request;

    try {
      switch (method) {
        case 'initialize':
          return this.handleInitialize(id, params as McpInitializeParams);

        case 'initialized':
          // Notification — no response
          return null;

        case 'ping':
          return { jsonrpc: '2.0', id, result: {} };

        case 'tools/list':
          return await this.handleToolsList(id);

        case 'tools/call':
          return await this.handleToolsCall(id, params as { name: string; arguments?: Record<string, unknown> });

        case 'shutdown':
          await this.mcpManager.shutdownAll();
          return { jsonrpc: '2.0', id, result: {} };

        default:
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Method not found: ${method}` },
          };
      }
    } catch (err) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  }

  private handleInitialize(id: number, _params: McpInitializeParams): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        serverInfo: { name: this.serverName, version: this.serverVersion },
        capabilities: { tools: {} },
      },
    };
  }

  private async handleToolsList(id: number): Promise<JsonRpcResponse> {
    if (this.dynamicDiscovery) {
      this.cachedTools = await collectAllTools(this.catalog, this.mcpManager);
    }
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: this.cachedTools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      },
    };
  }

  private async handleToolsCall(
    id: number,
    params: { name: string; arguments?: Record<string, unknown> },
  ): Promise<JsonRpcResponse> {
    const result = await routeToolCall(
      params.name,
      params.arguments ?? {},
      this.catalog,
      this.mcpManager,
    );
    return { jsonrpc: '2.0', id, result };
  }
}

export function createMcpStdioServer(
  catalog: AgentCatalogStore,
  options?: McpStdioServerOptions,
): McpStdioServer {
  return new McpStdioServer(catalog, options);
}
