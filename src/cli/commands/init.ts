import type { CommandHandler } from '../types.ts';

export const initCommand: CommandHandler = async (_args, { store }) => {
  const manifest = store.loadManifest();
  store.saveManifest(manifest);
  if (!store.loadLock()) {
    store.buildLock();
  }
  console.log('Initialized sources and source.lock');
};
