import { readFileSync } from 'node:fs';
import { parseFlags } from '../shared/flags.ts';
import type { CommandHandler } from '../types.ts';

export const contextCommand: CommandHandler = async (args, { store }) => {
  const action = args[0] ?? 'build';
  if (action === 'build') {
    store.buildContexts();
    console.log('Generated .maia/context.dev.json and .maia/context.llm.json');
    return;
  }

  if (action === 'show') {
    const { flags } = parseFlags(args.slice(1));
    const target = flags.for ?? 'dev';
    const paths = store.getPaths();
    const filePath = target === 'llm' ? paths.contextLlm : paths.contextDev;
    const content = readFileSync(filePath, 'utf8');
    console.log(content);
    return;
  }

  throw new Error(`Unknown context action "${action}". Use "build" or "show".`);
};
