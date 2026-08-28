import type { CommandHandler } from '../contracts/command-handler.ts';
import { reinstallFromLock } from '../shared/workspace/reinstall-from-lock.ts';
import { ensureInitialized } from './init/ensure-initialized.ts';
import { restoreConfiguredAgents } from './init/restore-configured-agents.ts';

/** Verifies existing artifacts before restoring missing lockfile materializations. */
export const ciCommand: CommandHandler = async (_args, { store }) => {
  ensureInitialized(store);

  const lock = store.loadLock();
  if (!lock) {
   throw new Error('maia.lock.json not found. Run "maia lock" first.');
  }
  store.verifyLock(lock, { allowMissingArtifacts: true });
  const result = await reinstallFromLock(store, lock);
  store.verifyLock(lock);
  restoreConfiguredAgents(store);
  console.log(`Verified ${Object.keys(lock.packages).length} locked entries`);
  console.log(`Reinstalled ${result.skills.length} skills and synced MCP config`);
};
