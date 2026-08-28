import type { AgentCatalogStore, McpDependency } from '../../../agent/catalog/store.ts';
import type { MCPConfig } from '../../../agent/tools/types.ts';
import { ensureMcpEnvFileEntries } from '../mcp-credentials.ts';

/** Installs and persists an MCP dependency in the catalog store. */
export function installMcp(
  store: AgentCatalogStore,
  name: string,
  source: string,
  version: string,
  allowedLlms: string[],
  vscode: MCPConfig,
): void {
  const dependency: McpDependency = {
    version,
    source,
    enabled: true,
    capabilities: [],
    constraints: [],
    allowedLlms,
    vscode,
  };
  ensureMcpEnvFileEntries(store, vscode);
  store.addDependency('mcp', name, dependency);
  store.buildLock();
  store.syncVsCodeMcp();
}
