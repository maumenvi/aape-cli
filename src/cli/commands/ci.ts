import type { CommandHandler } from '../types.ts';

export const ciCommand: CommandHandler = async (_args, { store }) => {
  const lock = store.loadLock();
  if (!lock) {
    throw new Error('source.lock not found. Run "aape lock" first.');
  }
  store.verifyLock(lock);
  console.log(`Verified ${Object.keys(lock.packages).length} locked entries`);
};
