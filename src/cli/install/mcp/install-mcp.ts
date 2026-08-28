import type { AgentCatalogStore } from '../../../agent/catalog/store/agent-catalog-store.ts';
import type { McpDependency } from '../../../agent/catalog/types/dependencies/mcp-dependency.ts';
import type { MCPConfig } from '../../../agent/tools/contracts/mcp-config.ts';
import { ensureMcpEnvFileEntries } from '../mcp-credentials/ensure-mcp-env-file-entries.ts';

/** Performs the install mcp operation. */
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
}
