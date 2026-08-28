import type { CommandHandler } from '../types.ts';
import { reinstallFromLock } from '../shared/workspace.ts';
import { ensureInitialized, restoreConfiguredAgents } from './init.ts';

/**
 * Reproducibly reinstalls the workspace from `source.lock`.
 *
 * Integrity is validated *before* any file is materialized: locked metadata is
 * verified up front, and each artifact's content hash is checked prior to being
 * written (see {@link reinstallFromLock}). A final post-write verification
 * guards against on-disk drift. This ordering guarantees a tampered lock or
 * source can never overwrite existing workspace files.
 */
export const ciCommand: CommandHandler = async (_args, { store }) => {
  ensureInitialized(store);

  const lock = store.loadLock();
  if (!lock) {
   throw new Error('source.lock not found. Run "maia lock" first.');
  }
  store.verifyLockMetadata(lock);
  const result = await reinstallFromLock(store, lock);
  store.verifyLock(lock);
  restoreConfiguredAgents(store);
  console.log(`Verified ${Object.keys(lock.packages).length} locked entries`);
  console.log(`Reinstalled ${result.skills.length} skills and synced MCP config`);
};
