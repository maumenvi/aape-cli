import { AgentCatalogStore } from '../catalog/store.ts';

export interface SkillCatalogEntry {
  name: string;
  description: string;
  source: string;
  allowedLlms?: string[];
}

export class AgentSkillDiscovery {
  private readonly catalog: AgentCatalogStore;

  constructor(catalog = new AgentCatalogStore()) {
    this.catalog = catalog;
  }

  async discover(query = ''): Promise<SkillCatalogEntry[]> {
    return this.catalog.discover('skill', query, 50);
  }

  describe() {
    const paths = this.catalog.getPaths();
    return {
      manifest: paths.manifest,
      lock: paths.lock,
      contextLlm: paths.contextLlm,
      contextDev: paths.contextDev,
    };
  }
}

export function createAgentSkillDiscovery(): AgentSkillDiscovery {
  return new AgentSkillDiscovery();
}
