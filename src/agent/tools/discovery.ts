import { AgentCatalogStore } from '../catalog/store.ts';

export interface ToolCatalogEntry {
  name: string;
  description: string;
  source: string;
  allowedLlms?: string[];
}

export class AgentToolDiscovery {
  private readonly catalog: AgentCatalogStore;

  constructor(catalog = new AgentCatalogStore()) {
    this.catalog = catalog;
  }

  async discover(query = ''): Promise<ToolCatalogEntry[]> {
    return this.catalog.discover('tool', query, 50);
  }

  describe() {
    const paths = this.catalog.getPaths();
    return {
      manifest: paths.manifest,
      lock: paths.lock,
    };
  }
}

export function createAgentToolDiscovery(): AgentToolDiscovery {
  return new AgentToolDiscovery();
}
