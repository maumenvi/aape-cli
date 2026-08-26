import type { CommandHandler } from '../types.ts';
import { reinstallFromLock } from '../shared/workspace.ts';
import { ensureInitialized, restoreConfiguredAgents } from './init.ts';

export const ciCommand: CommandHandler = async (_args, { store }) => {
  ensureInitialized(store);

  const lock = store.loadLock();
  if (!lock) {
   throw new Error('source.lock not found. Run "aape lock" first.');
  }
  store.verifyLock(lock);
  const result = await reinstallFromLock(store, lock);
  restoreConfiguredAgents(store);
  console.log(`Verified ${Object.keys(lock.packages).length} locked entries`);
  console.log(`Reinstalled ${result.skills.length} skills and synced MCP config`);
};
