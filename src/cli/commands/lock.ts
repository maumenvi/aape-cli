import type { CommandHandler } from '../types.ts';

export const lockCommand: CommandHandler = async (_args, { store }) => {
  store.buildLock();
  console.log('Updated source.lock');
};
