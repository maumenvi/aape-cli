import { searchCatalog, type CatalogSearchResult } from '../../agent/catalog/providers/index.ts';
import { discoverRegistryEntries } from '../../agent/catalog/registry/index.ts';
import type { CatalogKind } from '../../agent/catalog/types/index.ts';
import type { CommandHandler } from '../types.ts';

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

function installedLines(store: Parameters<CommandHandler>[1]['store']): string[] {
  return store.getInstalledPackages().map((entry) =>
    `${entry.type}:${entry.name}@${entry.version} source=${entry.source}`,
  );
}

function localRegistryLines(kind: CatalogKind): string[] {
  return discoverRegistryEntries(kind, '', 10).map((entry) =>
    `${kind}:${entry.name} - ${entry.description}`,
  );
}

function discoveredLines(kind: CatalogKind, results: CatalogSearchResult[]): string[] {
  return results.map((result) =>
    `${kind}:${result.name} provider=${result.provider} source=${result.source}`,
  );
}

export const listToolsCommand: CommandHandler = async (args, { store }) => {
  const query = args.join(' ').trim();
  const manifest = store.loadManifest();

  console.log('Aape capability discovery');

  printSection('Configured registries');
  const registries = Object.entries(manifest.registries).map(([id, registry]) =>
    `${id} (${registry.provider}) -> ${registry.url}`,
  );
  printLines(registries);

  printSection('Installed entries');
  printLines(installedLines(store));

  printSection('Local registry (skills)');
  printLines(localRegistryLines('skill'));

  printSection('Local registry (tools)');
  printLines(localRegistryLines('tool'));

  printSection('Local registry (mcps)');
  printLines(localRegistryLines('mcp'));

  if (!query) {
    console.log('\nTip: run `aape list-tools <query>` to also discover skills and MCPs from configured catalogs.');
    return;
  }

  printSection(`Catalog discovery for "${query}"`);
  const [skills, mcps] = await Promise.all([
    searchCatalog(manifest, 'skill', query, 10),
    searchCatalog(manifest, 'mcp', query, 10),
  ]);

  console.log('skills');
  printLines(discoveredLines('skill', skills));
  console.log('mcps');
  printLines(discoveredLines('mcp', mcps));
};

