import { searchCatalog } from '../../../agent/catalog/providers/core/search-catalog.ts';
import { discoverRegistryEntries } from '../../../agent/catalog/registry/discover.ts';
import type { CommandHandler } from '../../contracts/command-handler.ts';
import { discoveredLines } from './discovered-lines.ts';
import { installedSkillLines } from './installed-skill-lines.ts';
import { parseArgs } from './parse-args.ts';
import { printLines } from './print-lines.ts';
import { printSection } from './print-section.ts';

/** Performs the list skills command operation. */
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
      tip: 'maia list-skills <query>',
    };

    if (query) {
      payload.discovered = discoveredLines(await searchCatalog(manifest, 'skill', query, 10));
    }

    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log('Maia skill discovery');

  printSection('Configured registries');
  printLines(registries);

  printSection('Installed skills');
  printLines(installed);

  printSection('Local registry (skills)');
  printLines(local);

  if (!query) {
    console.log('\nTip: run `maia list-skills <query>` to search catalog entries or `maia skills find <query>` to install one.');
    return;
  }

  console.log('Searching skills in the catalog... this may take a few seconds.');
  printSection(`Catalog discovery for "${query}"`);
  const results = await searchCatalog(manifest, 'skill', query, 10);
  printLines(discoveredLines(results));
  console.log('\nTip: run `maia list-skills <query>` to search catalog entries or `maia skills find <query>` to install one.');
};
