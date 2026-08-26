import { searchCatalog, type CatalogSearchResult } from '../../agent/catalog/providers/index.ts';
import { discoverRegistryEntries } from '../../agent/catalog/registry/index.ts';
import type { CommandHandler } from '../types.ts';

function parseArgs(args: string[]): { json: boolean; query: string } {
  const filtered: string[] = [];
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--json' || arg === '--format=json') {
      json = true;
      continue;
    }
    if (arg === '--format') {
      const next = args[index + 1];
      if (next === 'json') {
        json = true;
        index += 1;
        continue;
      }
    }
    filtered.push(arg);
  }

  return { json, query: filtered.join(' ').trim() };
}

function printSection(title: string): void {
  console.log(`\n${title}`);
}

function printLines(lines: string[]): void {
  if (lines.length === 0) {
    console.log('- none');
    return;
  }

  for (const line of lines) {
    console.log(`- ${line}`);
  }
}

function installedSkillLines(store: Parameters<CommandHandler>[1]['store']): string[] {
  return store.getInstalledPackages('skill').map((entry) =>
    `skill:${entry.name}@${entry.version} source=${entry.source}`,
  );
}

function discoveredLines(results: CatalogSearchResult[]): string[] {
  return results.map((result) =>
    `skill:${result.name} provider=${result.provider} source=${result.source}`,
  );
}

export const listSkillsCommand: CommandHandler = async (args, { store }) => {
  const { json, query } = parseArgs(args);
  const manifest = store.loadManifest();
  const installed = installedSkillLines(store);
  const local = discoverRegistryEntries('skill', '', 10).map((entry) =>
    `skill:${entry.name} - ${entry.description}`,
  );
  const registries = Object.entries(manifest.registries).map(([id, registry]) =>
    `${id} (${registry.provider}) -> ${registry.url}`,
  );

  if (json) {
    const payload = {
      kind: 'skill-discovery',
      query,
      registries,
      installed,
      local,
      discovered: [] as string[],
      tip: 'aape list-skills <query>',
    };

    if (query) {
      payload.discovered = discoveredLines(await searchCatalog(manifest, 'skill', query, 10));
    }

    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log('Aape skill discovery');

  printSection('Configured registries');
  printLines(registries);

  printSection('Installed skills');
  printLines(installed);

  printSection('Local registry (skills)');
  printLines(local);

  if (!query) {
    console.log('\nTip: run `aape list-skills <query>` to search catalog entries or `aape skills find <query>` to install one.');
    return;
  }

  console.log('Searching skills in the catalog... this may take a few seconds.');
  printSection(`Catalog discovery for "${query}"`);
  const results = await searchCatalog(manifest, 'skill', query, 10);
  printLines(discoveredLines(results));
  console.log('\nTip: run `aape list-skills <query>` to search catalog entries or `aape skills find <query>` to install one.');
};
