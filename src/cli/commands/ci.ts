import type { CommandHandler } from '../types.ts';
import { reinstallFromLock } from '../shared/workspace.ts';

export const ciCommand: CommandHandler = async (_args, { store }) => {
  const lock = store.loadLock();
  if (!lock) {
   throw new Error('source.lock not found. Run "aape lock" first.');
  }
  store.verifyLock(lock);
  const result = await reinstallFromLock(store, lock);
  console.log(`Verified ${Object.keys(lock.packages).length} locked entries`);
  console.log(`Reinstalled ${result.skills.length} skills and synced MCP config`);
};
