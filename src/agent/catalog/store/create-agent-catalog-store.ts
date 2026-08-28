import type { CatalogStoreOptions } from '../types/index.ts';
import { AgentCatalogStore } from './agent-catalog-store.ts';

/** Creates a catalog store using the supplied options. */
export function createAgentCatalogStore(options: CatalogStoreOptions = {}): AgentCatalogStore {
  return new AgentCatalogStore(options);
}
