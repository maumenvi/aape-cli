import { findCatalogProvider, type CatalogSearchResult } from '../../agent/catalog/providers/index.ts';
import type { AgentCatalogStore } from '../../agent/catalog/store.ts';
import { installMcp } from './mcp.ts';
import { installSkill } from './skill.ts';

export function bestCatalogMatch(results: CatalogSearchResult[], query: string): CatalogSearchResult | null {
  const normalized = query.trim().toLowerCase();
  return results.find((result) => result.name.toLowerCase() === normalized)
    ?? results[0]
    ?? null;
}

export async function installCatalogResult(
  store: AgentCatalogStore,
  result: CatalogSearchResult,
  allowedLlms: string[] = ['*'],
): Promise<void> {
  const manifest = store.loadManifest();
  const provider = findCatalogProvider(manifest, result.provider);
  const resolved = await provider.resolve(result);
  store.addSource(resolved.sourceAlias, resolved.source);

  if (result.kind === 'skill') {
    await installSkill(store, {
      name: result.name,
      source: resolved.sourceAlias,
      version: result.version ?? '*',
      allowedLlms,
    });
    return;
  }

  if (result.kind === 'mcp' && result.install.type === 'mcp') {
    installMcp(
      store,
      result.name,
      resolved.sourceAlias,
      result.version ?? '*',
      allowedLlms,
      result.install.vscode,
    );
    return;
  }

  throw new Error(`External installation is not supported for ${result.kind}`);
}
