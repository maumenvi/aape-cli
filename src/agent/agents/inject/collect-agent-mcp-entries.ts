import type { AgentCatalogStore } from '../../catalog/store/agent-catalog-store.ts';
import type { AgentMcpEntry } from '../contracts/agent-mcp-entry.ts';
import type { AgentTarget } from '../contracts/agent-target.ts';
import { resolveAuthorizedPackages } from '../profiles/resolve-authorized-packages.ts';
import { mcpConfigToServerEntry } from './mcp-config-to-server-entry.ts';

/**
 * Build every MCP entry that should be registered natively for one agent:
 * each installed MCP server that is enabled and authorized for the agent,
 * plus the aggregating `maia` proxy server (kept last so it always wins on key
 * collisions).
 */
export function collectAgentMcpEntries(store: AgentCatalogStore, target: AgentTarget): AgentMcpEntry[] {
  const projectRoot = store.getPaths().projectRoot;

  const mcpEntries = resolveAuthorizedPackages(store, target)
    .filter((pkg) => pkg.type === 'mcp')
    .map<AgentMcpEntry>((pkg) => {
      if (!pkg.vscode) {
        throw new Error(`MCP "${pkg.name}" is missing its transport config in the lock`);
      }
      return { key: pkg.name, config: mcpConfigToServerEntry(pkg.name, pkg.vscode) };
    });

  return [...mcpEntries, target.buildEntry(projectRoot, target.id)];
}
