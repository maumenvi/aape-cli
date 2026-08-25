import { normalizeKind } from '../shared/kind.ts';
import type { CommandHandler } from '../types.ts';

export const removeCommand: CommandHandler = async (args, { store }) => {
  const kind = normalizeKind(args[0] ?? '');
  const name = args[1];
  if (!name) {
    throw new Error(`Usage: aape rm ${kind} <name>`);
  }

  store.removeDependency(kind, name);
  store.buildLock();
  console.log(`Removed ${kind}:${name}`);
};
