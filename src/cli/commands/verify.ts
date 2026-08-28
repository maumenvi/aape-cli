import type { CommandHandler } from '../contracts/command-handler.ts';

/** Performs the verify command operation. */
export const verifyCommand: CommandHandler = async (_args, { store }) => {
  const lock = store.loadLock();
  if (!lock) {
    throw new Error('maia.lock.json not found. Run "maia lock" first.');
  }
  store.verifyLock(lock);
  console.log('maia.lock.json integrity OK');
};
