import type { Repository } from '../../tools/types.ts';
import { AgentCatalogStore, type McpDependency } from '../../catalog/store.ts';
import type { McpCallToolResult, McpSession, McpToolDescriptor } from '../runtime/index.ts';
import type { McpHealthcheckResult, McpOperationOptions, McpReliabilityConfig } from '../reliability/index.ts';
import type { MCPConfig } from '../../tools/types.ts';
import { canLlmAccessResource, resolveAllowedLlms, type LlmAccessPolicy } from '../../access/policy.ts';
import { DEFAULT_RELIABILITY_CONFIG } from './defaults.ts';
import { describeManager } from './describe.ts';
import { McpResilienceController, toErrorMessage } from './resilience.ts';
import { ensureHealthySession, getOrStartSession, invalidateSession, stopSession } from './session.ts';
import { syncVsCodeMcpConfig } from '../../catalog/context/index.ts';

interface LlmAccessPolicyProvider {
  getAccessPolicy(id: string): Required<LlmAccessPolicy>;
}

export class AgentMcpManager {
  private readonly repositories: Repository[] = [];
  private readonly catalog: AgentCatalogStore;
  private readonly sessions = new Map<string, McpSession>();
  private readonly reliability: McpReliabilityConfig;
  private readonly resilience: McpResilienceController;
  private readonly llmAccessPolicies?: LlmAccessPolicyProvider;

  constructor(catalog = new AgentCatalogStore(), reliability: Partial<McpReliabilityConfig> = {}, llmAccessPolicies?: LlmAccessPolicyProvider) {
    this.catalog = catalog;
    this.reliability = {
      ...DEFAULT_RELIABILITY_CONFIG,
      ...reliability,
    };
    this.resilience = new McpResilienceController(this.reliability);
    this.llmAccessPolicies = llmAccessPolicies;
  }

  add(repo: Repository): AgentMcpManager {
    return this.addRepository(repo);
  }

  addRepository(repo: Repository): AgentMcpManager {
    this.repositories.push(repo);
    if (repo.url) {
      this.catalog.addSource(repo.name ?? `source-${this.repositories.length}`, {
        type: 'git',
        url: repo.url,
        ref: repo.ref ?? 'main',
        trusted: repo.trusted ?? false,
      });
    }
    return this;
  }

  list(options: { llmId?: string } = {}): Array<{ name: string; description: string; type: string; url?: string; allowedLlms: string[] }> {
    const defaultPolicy = this.catalog.getLlmAccessDefault();
    const installed = this.catalog.getInstalledPackages('mcp').map((entry) => ({
      name: entry.name,
      description: `MCP ${entry.name} from ${entry.source}@${entry.version}`,
      type: 'git',
      url: entry.provenance.repo,
      allowedLlms: resolveAllowedLlms(entry.allowedLlms, defaultPolicy),
    }));
    const merged = [...installed, ...this.repositories.map((repo) => ({
      name: repo.name ?? repo.url ?? repo.type,
      description: `MCP registry entry from ${repo.type}: ${repo.url ?? repo.name ?? repo.type}`,
      type: repo.type,
      url: repo.url,
      allowedLlms: ['*'],
    }))];
    const llmId = options.llmId;
    return merged.filter((item) => this.isLlmAllowed(llmId, item.name, item.allowedLlms));
  }

  async install(identifier: string, repoOrConfig?: Repository | McpDependency): Promise<AgentMcpManager> {
    if (repoOrConfig && 'type' in repoOrConfig) {
      return this.addRepository(repoOrConfig);
    }

    if (repoOrConfig && 'vscode' in repoOrConfig) {
      this.catalog.addDependency('mcp', identifier, repoOrConfig);
      this.catalog.buildLock();
      return this;
    }

    const discovered = this.catalog.discover('mcp', identifier, 1)[0];
    const defaultVscode = discovered
      ? {
          command: `npx`,
          args: ['-y', `@modelcontextprotocol/server-${identifier}`],
          env: {},
        }
      : {
          command: identifier,
          args: [],
          env: {},
        };
    this.catalog.addDependency('mcp', identifier, {
      version: '*',
      source: 'local',
      enabled: true,
      capabilities: [],
      constraints: [],
      allowedLlms: ['*'],
      vscode: defaultVscode,
    });
    this.catalog.buildLock();
    return this;
  }

  async installWithVscode(identifier: string, dependency: McpDependency): Promise<AgentMcpManager> {
    await this.install(identifier, dependency);
    return this;
  }

  async syncVsCodeConfig(): Promise<ReturnType<typeof syncVsCodeMcpConfig>> {
    return this.catalog.syncVsCodeMcp();
  }

  async startServer(serverName: string, options: McpOperationOptions = {}): Promise<McpSession> {
    this.assertLlmAccess(options.llmId, serverName);
    return this.resilience.executeWithResilience(
      serverName,
      options,
      () => getOrStartSession(this.catalog, this.sessions, serverName, options.timeoutMs),
      () => invalidateSession(this.sessions, serverName),
    );
  }

  async stopServer(serverName: string, options: { timeoutMs?: number } = {}): Promise<void> {
    await stopSession(this.sessions, serverName, options.timeoutMs);
  }

  async listTools(serverName: string, options: McpOperationOptions = {}): Promise<McpToolDescriptor[]> {
    this.assertLlmAccess(options.llmId, serverName);
    return this.resilience.executeWithResilience(
      serverName,
      options,
      async () => {
        const session = await getOrStartSession(this.catalog, this.sessions, serverName, options.timeoutMs);
        const result = await session.client.listTools({ timeoutMs: options.timeoutMs });
        session.lastHealthcheckAt = Date.now();
        return result.tools;
      },
      () => invalidateSession(this.sessions, serverName),
    );
  }

  async callTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown> = {},
    options: McpOperationOptions = {},
  ): Promise<McpCallToolResult> {
    this.assertLlmAccess(options.llmId, serverName);
    return this.resilience.executeWithResilience(
      serverName,
      options,
      async () => {
        const session = await getOrStartSession(this.catalog, this.sessions, serverName, options.timeoutMs);
        await ensureHealthySession(session, this.reliability, options.timeoutMs);
        const result = await session.client.callTool(toolName, args, { timeoutMs: options.timeoutMs });
        session.lastHealthcheckAt = Date.now();
        return result;
      },
      async (error) => {
        if (this.shouldInvalidateSessionAfterFailure(error)) {
          await invalidateSession(this.sessions, serverName);
        }
      },
    );
  }

  async healthcheck(serverName: string, options: McpOperationOptions = {}): Promise<McpHealthcheckResult> {
    this.assertLlmAccess(options.llmId, serverName);
    const checkedAt = Date.now();
    try {
      const session = await getOrStartSession(this.catalog, this.sessions, serverName, options.timeoutMs);
      await session.client.listTools({ timeoutMs: options.timeoutMs });
      session.lastHealthcheckAt = checkedAt;
      session.status = 'running';
      this.resilience.recordSuccess(serverName);
      return {
        serverName,
        ok: true,
        checkedAt,
        status: 'running',
      };
    } catch (error) {
      const message = toErrorMessage(error);
      this.resilience.recordFailure(serverName, message);
      await invalidateSession(this.sessions, serverName);
      return {
        serverName,
        ok: false,
        checkedAt,
        status: 'failed',
        error: message,
      };
    }
  }

  async shutdownAll(options: { timeoutMs?: number } = {}): Promise<void> {
    const names = [...this.sessions.keys()];
    for (const name of names) {
      await this.stopServer(name, options);
    }
  }

  async discover(query = '', limit = 10, options: { llmId?: string } = {}) {
    const search = query.trim().toLowerCase();
    const entries = this.catalog.discover('mcp', search, limit);
    return entries
      .filter((entry) => this.isLlmAllowed(options.llmId, entry.name, entry.allowedLlms))
      .map((entry) => ({
      name: entry.name,
      description: entry.description,
    }));
  }

  describe() {
    return describeManager(
      this.catalog,
      this.repositories,
      this.sessions,
      this.reliability,
      this.resilience.describeCircuits(),
    );
  }

  private shouldInvalidateSessionAfterFailure(error: unknown): boolean {
    const message = toErrorMessage(error).toLowerCase();
    if (message.includes('mcp process exited')) return true;
    if (message.includes('mcp transport is closed')) return true;
    if (message.includes('request timed out')) return true;
    if (message.includes('spawn ')) return true;
    if (message.includes('http transport failed')) return true;
    if (message.includes('sse transport failed')) return true;
    if (message.includes('websocket transport')) return true;
    if (message.includes('fetch failed')) return true;
    return false;
  }

  private isLlmAllowed(llmId: string | undefined, serverName: string, allowedLlms?: string[]): boolean {
    if (!llmId) return true;
    const llmPolicy = this.llmAccessPolicies?.getAccessPolicy(llmId);
    return canLlmAccessResource(
      llmId,
      'mcp',
      serverName,
      llmPolicy,
      allowedLlms,
      this.catalog.getLlmAccessDefault(),
    );
  }

  private assertLlmAccess(llmId: string | undefined, serverName: string): void {
    const pkg = this.catalog.getInstalledPackages('mcp').find((entry) => entry.name === serverName);
    const allowedLlms = pkg?.allowedLlms;
    if (!this.isLlmAllowed(llmId, serverName, allowedLlms)) {
      throw new Error(`MCP server "${serverName}" is not installed or has no MCP config.`);
    }
  }
}

export class McpManager extends AgentMcpManager {}

export function createAgentMcpManager(
  catalog?: AgentCatalogStore,
  reliability?: Partial<McpReliabilityConfig>,
  llmAccessPolicies?: LlmAccessPolicyProvider,
): AgentMcpManager {
  return new AgentMcpManager(catalog, reliability, llmAccessPolicies);
}

export function createMcpManager(
  catalog?: AgentCatalogStore,
  reliability?: Partial<McpReliabilityConfig>,
  llmAccessPolicies?: LlmAccessPolicyProvider,
): McpManager {
  return new McpManager(catalog, reliability, llmAccessPolicies);
}
