import { searchCatalog, type CatalogSearchResult } from '../../agent/catalog/providers/index.ts';
import { discoverRegistryEntries } from '../../agent/catalog/registry/index.ts';
import type { CatalogKind } from '../../agent/catalog/types/index.ts';
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

export const listCapabilitiesCommand: CommandHandler = async (args, { store }) => {
  const { json, query } = parseArgs(args);
  const manifest = store.loadManifest();

  const registries = Object.entries(manifest.registries).map(([id, registry]) =>
    `${id} (${registry.provider}) -> ${registry.url}`,
  );

  const installed = installedLines(store);
  const local = {
    skills: localRegistryLines('skill'),
    tools: localRegistryLines('tool'),
    mcps: localRegistryLines('mcp'),
  };

  if (json) {
    const payload = {
      kind: 'capabilities',
      query,
      registries,
      installed,
      local,
      discovered: {
        skills: [] as string[],
        tools: [] as string[],
        mcps: [] as string[],
      },
      tip: 'aape list-capabilities <query>',
    };

    if (query) {
      const [skills, tools, mcps] = await Promise.all([
        searchCatalog(manifest, 'skill', query, 10),
        searchCatalog(manifest, 'tool', query, 10),
        searchCatalog(manifest, 'mcp', query, 10),
      ]);
      payload.discovered = {
        skills: discoveredLines('skill', skills),
        tools: discoveredLines('tool', tools),
        mcps: discoveredLines('mcp', mcps),
      };
    }

    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log('Aape capability discovery');

  printSection('Configured registries');
  printLines(registries);

  printSection('Installed entries');
  printLines(installed);

  printSection('Local registry (skills)');
  printLines(local.skills);

  printSection('Local registry (tools)');
  printLines(local.tools);

  printSection('Local registry (mcps)');
  printLines(local.mcps);

  if (!query) {
    console.log('\nTip: run `aape list-capabilities <query>` to also discover skills, tools, and MCPs from configured catalogs.');
    return;
  }

  console.log('Searching skills, tools, and MCPs in the catalog... this may take a few seconds.');
  printSection(`Catalog discovery for "${query}"`);
  const [skills, tools, mcps] = await Promise.all([
    searchCatalog(manifest, 'skill', query, 10),
    searchCatalog(manifest, 'tool', query, 10),
    searchCatalog(manifest, 'mcp', query, 10),
  ]);

  console.log('skills');
  printLines(discoveredLines('skill', skills));
  console.log('tools');
  printLines(discoveredLines('tool', tools));
  console.log('mcps');
  printLines(discoveredLines('mcp', mcps));
};
