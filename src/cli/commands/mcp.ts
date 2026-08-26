import { searchCatalog, type CatalogSearchResult } from '../../agent/catalog/providers/index.ts';
import type { AgentCatalogStore } from '../../agent/catalog/store.ts';
import { bestCatalogMatch, installCatalogResult } from '../install/external.ts';
import { selectCatalogResult } from '../shared/select.ts';
import type { CommandHandler } from '../types.ts';

export async function discoverMcpsFromStore(
  store: AgentCatalogStore,
  query = '',
): Promise<CatalogSearchResult[]> {
  if (query.trim()) {
    console.log('Searching MCPs in the catalog... this may take a few seconds.');
  }
  return searchCatalog(store.loadManifest(), 'mcp', query, 20);
}

export const mcpCommand: CommandHandler = async (args, { store }) => {
  const action = args[0];
  if (action === 'sync') {
    const result = store.syncVsCodeMcp();
    console.log(`Synced ${Object.keys(result.servers).length} MCP server(s) to ${result.file}`);
    return;
  }

  if (action === 'find') {
    const results = await discoverMcpsFromStore(store, args.slice(1).join(' '));
    if (results.length === 0) {
      console.log('No MCPs were found for the provided search.');
      return;
    }
    const selected = await selectCatalogResult(results);
    if (selected) {
      await installCatalogResult(store, selected);
      console.log(`Installed mcp:${selected.name}`);
    }
    return;
  }

  if (action === 'add' || action === 'install') {
    const query = args.slice(1).join(' ');
    if (!query) {
      throw new Error('Usage: aape mcp add <name>');
    }
    const selected = bestCatalogMatch(await discoverMcpsFromStore(store, query), query);
    if (!selected) {
      throw new Error(`MCP "${query}" was not found in configured catalogs`);
    }
    await installCatalogResult(store, selected);
    console.log(`Installed mcp:${selected.name}`);
    return;
  }

  throw new Error('Usage: aape mcp sync | aape mcp find <query> | aape mcp add <name>');
};
