import type { AgentCatalogStore } from '../../catalog/store.ts';
import type { Repository } from '../../tools/types.ts';
import type { CircuitState, McpReliabilityConfig } from '../reliability/index.ts';
import type { McpSession } from '../runtime/index.ts';

export function describeManager(
  catalog: AgentCatalogStore,
  repositories: Repository[],
  sessions: Map<string, McpSession>,
  reliability: McpReliabilityConfig,
  circuits: Array<{ serverName: string } & CircuitState>,
) {
  const installed = catalog.getInstalledPackages('mcp').map((pkg) => ({
    name: pkg.name,
    description: `MCP server ${pkg.name}`,
    inputSchema: { type: 'object', properties: {} },
    vscode: pkg.vscode,
  }));

  return {
    config: { tools: installed },
    tools: installed,
    repositories,
    lock: catalog.getPaths().lock,
    manifest: catalog.getPaths().manifest,
    reliability,
    circuits,
    sessions: [...sessions.values()].map((session) => ({
      serverName: session.serverName,
      status: session.status,
      startedAt: session.startedAt,
      lastHealthcheckAt: session.lastHealthcheckAt,
      lastError: session.lastError,
    })),
  };
}
