import type { AgentCatalogStore } from '../agent/catalog/store.ts';

export interface CliContext {
  store: AgentCatalogStore;
}

export type CommandHandler = (args: string[], context: CliContext) => Promise<void>;
