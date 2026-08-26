import type { AgentCatalogStore } from '../../catalog/store.ts';
import { AgentMcpManager } from '../manager/index.ts';
import type { McpToolEntry } from './types.ts';

const DEFAULT_SCHEMA: Record<string, unknown> = { type: 'object', properties: {} };

/** Collect tools exposed by skill and tool packages (no subprocess needed). */
function collectLocalEntries(catalog: AgentCatalogStore): McpToolEntry[] {
  const entries: McpToolEntry[] = [];

  for (const pkg of catalog.getInstalledPackages()) {
    if (!pkg.enabled) continue;

    if (pkg.type === 'skill') {
      entries.push({
        name: pkg.name,
        description: pkg.capabilities?.join(', ') || `Skill: ${pkg.name}`,
        inputSchema: (pkg.inputSchema as Record<string, unknown>) ?? DEFAULT_SCHEMA,
        origin: `skill:${pkg.name}`,
      });
    }

    if (pkg.type === 'tool') {
      entries.push({
        name: pkg.name,
        description: pkg.capabilities?.join(', ') || `Tool: ${pkg.name}`,
        inputSchema: (pkg.inputSchema as Record<string, unknown>) ?? DEFAULT_SCHEMA,
        origin: `tool:${pkg.name}`,
      });
    }
  }

  return entries;
}

/** Collect tools from all enabled MCP servers by querying them via JSON-RPC. */
async function collectMcpEntries(
  catalog: AgentCatalogStore,
  mcpManager: AgentMcpManager,
): Promise<McpToolEntry[]> {
  const entries: McpToolEntry[] = [];

  const mcpPackages = catalog.getInstalledPackages('mcp').filter((p) => p.enabled && p.vscode);

  await Promise.allSettled(
    mcpPackages.map(async (pkg) => {
      try {
        const tools = await mcpManager.listTools(pkg.name);
        for (const tool of tools) {
          entries.push({
            name: `${pkg.name}__${tool.name}`,
            description: tool.description ?? `${pkg.name}: ${tool.name}`,
            inputSchema: (tool.inputSchema as Record<string, unknown>) ?? DEFAULT_SCHEMA,
            origin: `mcp:${pkg.name}`,
          });
        }
      } catch {
        // Server unreachable at startup — skip silently; will retry on next list call
      }
    }),
  );

  return entries;
}

export async function collectAllTools(
  catalog: AgentCatalogStore,
  mcpManager: AgentMcpManager,
): Promise<McpToolEntry[]> {
  const [local, mcp] = await Promise.all([
    collectLocalEntries(catalog),
    collectMcpEntries(catalog, mcpManager),
  ]);
  return [...local, ...mcp];
}
