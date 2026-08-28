import type { CommandHandler } from '../contracts/command-handler.ts';

/** Performs the lock command operation. */
export const lockCommand: CommandHandler = async (_args, { store }) => {
  store.buildLock();
  console.log('Updated maia.lock.json');
};
