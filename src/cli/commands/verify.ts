import type { CommandHandler } from '../types.ts';

export const verifyCommand: CommandHandler = async (_args, { store }) => {
  const lock = store.loadLock();
  if (!lock) {
    throw new Error('source.lock not found. Run "maia lock" first.');
  }
  store.verifyLock(lock);
  console.log('source.lock integrity OK');
};
