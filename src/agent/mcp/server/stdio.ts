import { createInterface } from 'node:readline';
import type { AgentCatalogStore } from '../../catalog/store.ts';
import { AgentMcpManager } from '../manager/index.ts';
import {
  createModernResultMeta,
  MCP_MODERN_PROTOCOL_VERSION,
  negotiateMcpProtocolVersion,
  readModernRequestMeta,
  type JsonRpcFailure,
  type JsonRpcId,
  type JsonRpcRequest,
  type JsonRpcResponse,
} from '../runtime/protocol/json-rpc.ts';
import { collectAllTools } from './collect.ts';
import type { McpStdioServerOptions } from './mcp-stdio-server-options.ts';
import { routeToolCall } from './router.ts';
import type { McpInitializeParams, McpToolEntry } from './types.ts';

/** Serves installed Maia tools over both modern stateless and legacy stateful MCP. */
export class McpStdioServer {
  private readonly catalog: AgentCatalogStore;
  private readonly mcpManager: AgentMcpManager;
  private readonly serverName: string;
  private readonly serverVersion: string;
  private readonly dynamicDiscovery: boolean;
  private cachedTools: McpToolEntry[] = [];

  /** Creates a dual-era aggregate server backed by the supplied catalog. */
  constructor(catalog: AgentCatalogStore, options: McpStdioServerOptions = {}) {
    this.catalog = catalog;
    this.mcpManager = new AgentMcpManager(catalog);
    this.serverName = options.name ?? 'maia-mcp-server';
    this.serverVersion = options.version ?? '1.0.0';
    this.dynamicDiscovery = options.dynamicDiscovery ?? false;
  }

  /** Starts newline-delimited JSON-RPC processing on stdin/stdout. */
  async start(): Promise<void> {
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

  /** Writes one JSON-RPC response without contaminating stdout framing. */
  private send(payload: JsonRpcResponse): void {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
  }

  /** Routes one request according to its modern metadata or legacy lifecycle. */
  private async handle(request: JsonRpcRequest): Promise<JsonRpcResponse | null> {
    const { id, method, params } = request;
    const modernVersion = this.readRequestedModernVersion(params);
    const modern = typeof modernVersion === 'string';

    if (modernVersion && modernVersion !== MCP_MODERN_PROTOCOL_VERSION) {
      return this.unsupportedProtocol(id, modernVersion);
    }

    try {
      if (method === 'server/discover') {
        readModernRequestMeta(params);
        return this.handleDiscover(id);
      }
      if (method === 'initialize') {
        return this.handleInitialize(id, params as McpInitializeParams);
      }
      if (method === 'notifications/initialized') {
        return null;
      }
      if (method === 'tools/list') {
        if (modern) readModernRequestMeta(params);
        return await this.handleToolsList(id, modern);
      }
      if (method === 'tools/call') {
        if (modern) readModernRequestMeta(params);
        return await this.handleToolsCall(
          id,
          params as { name: string; arguments?: Record<string, unknown> },
          modern,
        );
      }
      if (!modern && method === 'ping') {
        return { jsonrpc: '2.0', id, result: {} };
      }
      if (!modern && method === 'shutdown') {
        await this.mcpManager.shutdownAll();
        return { jsonrpc: '2.0', id, result: {} };
      }
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: modern ? -32602 : -32603,
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /** Reads a per-request modern protocol revision without accepting incomplete metadata. */
  private readRequestedModernVersion(params: unknown): string | undefined {
    if (!params || typeof params !== 'object') return undefined;
    const meta = (params as { _meta?: unknown })._meta;
    if (!meta || typeof meta !== 'object') return undefined;
    const version = (meta as Record<string, unknown>)['io.modelcontextprotocol/protocolVersion'];
    return typeof version === 'string' ? version : undefined;
  }

  /** Returns the protocol-defined modern unsupported-version error. */
  private unsupportedProtocol(id: JsonRpcId, requested: string): JsonRpcFailure {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32022,
        message: `Unsupported MCP protocol version ${requested}`,
        data: {
          supported: [MCP_MODERN_PROTOCOL_VERSION],
          requested,
        },
      },
    };
  }

  /** Advertises the modern stateless era, tool capability, and server identity. */
  private handleDiscover(id: JsonRpcId): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        resultType: 'complete',
        supportedVersions: [MCP_MODERN_PROTOCOL_VERSION],
        capabilities: { tools: {} },
        instructions: 'Discovers and invokes tools installed in the current Maia workspace.',
        ttlMs: 60_000,
        cacheScope: 'private',
        _meta: createModernResultMeta(this.serverName, this.serverVersion),
      },
    };
  }

  /** Negotiates a supported stateful protocol revision. */
  private handleInitialize(id: JsonRpcId, params: McpInitializeParams): JsonRpcResponse {
    const protocolVersion = negotiateMcpProtocolVersion(params?.protocolVersion);
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion,
        serverInfo: { name: this.serverName, version: this.serverVersion },
        capabilities: { tools: {} },
      },
    };
  }

  /** Returns currently installed tools in the response shape required by the selected era. */
  private async handleToolsList(id: JsonRpcId, modern: boolean): Promise<JsonRpcResponse> {
    if (this.dynamicDiscovery) {
      this.cachedTools = await collectAllTools(this.catalog, this.mcpManager);
    }
    const tools = this.cachedTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
    return {
      jsonrpc: '2.0',
      id,
      result: modern
        ? {
            resultType: 'complete',
            tools,
            _meta: createModernResultMeta(this.serverName, this.serverVersion),
          }
        : { tools },
    };
  }

  /** Invokes an installed tool and stamps modern result metadata when required. */
  private async handleToolsCall(
    id: JsonRpcId,
    params: { name: string; arguments?: Record<string, unknown> },
    modern: boolean,
  ): Promise<JsonRpcResponse> {
    const result = await routeToolCall(
      params.name,
      params.arguments ?? {},
      this.catalog,
      this.mcpManager,
    );
    return {
      jsonrpc: '2.0',
      id,
      result: modern
        ? {
            ...result,
            resultType: 'complete',
            _meta: createModernResultMeta(this.serverName, this.serverVersion),
          }
        : result,
    };
  }
}
