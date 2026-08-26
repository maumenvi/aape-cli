import type { CatalogKind, CatalogRegistryConfig, SourcesManifest } from '../types/index.ts';
import { McpRegistryProvider } from './mcp-registry.ts';
import { SkillsShProvider } from './skills-sh.ts';
import type { CatalogProvider, CatalogSearchResult } from './types.ts';

export type {
  CatalogInstall,
  CatalogProvider,
  CatalogSearchResult,
  ResolvedCatalogEntry,
} from './types.ts';

function createProvider(id: string, config: CatalogRegistryConfig): CatalogProvider {
  if (config.provider === 'skills.sh') {
    return new SkillsShProvider(id, config.url);
  }
  return new McpRegistryProvider(id, config.url);
}

export function createCatalogProviders(manifest: Pick<SourcesManifest, 'registries'>): CatalogProvider[] {
  return Object.entries(manifest.registries).map(([id, config]) => createProvider(id, config));
}

export async function searchCatalog(
  manifest: Pick<SourcesManifest, 'registries'>,
  kind: CatalogKind,
  query: string,
  limit = 10,
): Promise<CatalogSearchResult[]> {
  const providers = createCatalogProviders(manifest).filter((provider) => provider.kinds.includes(kind));
  const pages = await Promise.all(providers.map((provider) => provider.search(query, limit)));
  return pages.flat().slice(0, limit);
}

export function findCatalogProvider(
  manifest: Pick<SourcesManifest, 'registries'>,
  id: string,
): CatalogProvider {
  const provider = createCatalogProviders(manifest).find((candidate) => candidate.id === id);
  if (!provider) {
    throw new Error(`Catalog provider "${id}" is not configured`);
  }
  return provider;
}
