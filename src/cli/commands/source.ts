import { parseFlags } from '../shared/flags.ts';
import type { CommandHandler } from '../types.ts';

export const sourceCommand: CommandHandler = async (args, { store }) => {
  const action = args[0];
  if (action === 'add') {
    const alias = args[1];
    const repo = args[2];
    const { flags } = parseFlags(args.slice(3));
    if (!alias || !repo) {
      throw new Error('Usage: maia source add <alias> <repo-url> [--ref <ref>] [--trusted true|false]');
    }
    store.addSource(alias, {
      type: 'git',
      url: repo,
      ref: flags.ref ?? 'main',
      trusted: flags.trusted === 'true',
    });
    store.buildLock();
    console.log(`Added source ${alias}`);
    return;
  }

  if (action === 'ls') {
    const manifest = store.loadManifest();
    console.log(JSON.stringify({
      registries: manifest.registries,
      sources: manifest.sources,
    }, null, 2));
    return;
  }

  throw new Error('Usage: maia source add|ls ...');
};
