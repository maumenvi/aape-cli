import type { AgentCatalogStore } from '../../agent/catalog/store.ts';

/** Provides shared dependencies available to CLI command handlers. */
export interface CliContext {
  store: AgentCatalogStore;
}
