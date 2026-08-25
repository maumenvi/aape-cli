import { AgentCatalogStore } from '../catalog/store.ts';

export interface McpCatalogEntry {
  name: string;
  description: string;
  source: string;
  allowedLlms?: string[];
}

export class AgentMcpDiscovery {
  private readonly catalog: AgentCatalogStore;

  constructor(catalog = new AgentCatalogStore()) {
    this.catalog = catalog;
  }

  async discover(query = ''): Promise<McpCatalogEntry[]> {
    return this.catalog.discover('mcp', query, 50);
  }

  describe() {
    const paths = this.catalog.getPaths();
    return {
      manifest: paths.manifest,
      lock: paths.lock,
      vscodeMcp: paths.vscodeMcp,
    };
  }
}

export function createAgentMcpDiscovery(): AgentMcpDiscovery {
  return new AgentMcpDiscovery();
}
