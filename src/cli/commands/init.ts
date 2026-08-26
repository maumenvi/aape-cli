import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { AgentCatalogStore } from '../../agent/catalog/store.ts';
import type { CommandHandler } from '../types.ts';

export function ensureInitialized(store: AgentCatalogStore): void {
  const manifest = store.loadManifest();
  store.saveManifest(manifest);
  if (!store.loadLock()) {
    store.buildLock();
  }
  mkdirSync(path.resolve(path.dirname(store.getPaths().manifest), 'skills'), { recursive: true });
}

export const initCommand: CommandHandler = async (_args, { store }) => {
  ensureInitialized(store);
  console.log('Initialized sources and source.lock');
};
