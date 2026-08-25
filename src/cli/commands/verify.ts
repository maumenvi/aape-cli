import type { CommandHandler } from '../types.ts';

export const verifyCommand: CommandHandler = async (_args, { store }) => {
  store.verifyLock();
  console.log('source.lock integrity OK');
};
