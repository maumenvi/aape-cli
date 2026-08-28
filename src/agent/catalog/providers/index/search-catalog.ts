import type { CatalogKind, SourcesManifest } from '../../types/index.ts';
import type { CatalogSearchResult } from '../types.ts';
import { createCatalogProviders } from './create-catalog-providers.ts';

/** Searches configured providers for catalog entries of the requested kind. */
export async function searchCatalog(
  manifest: Pick<SourcesManifest, 'registries'>,
  kind: CatalogKind,
  query: string,
  limit = 10,
): Promise<CatalogSearchResult[]> {
  const providers = createCatalogProviders(manifest).filter((provider) => provider.kinds.includes(kind));
  const settled = await Promise.allSettled(providers.map((provider) => provider.search(query, limit)));
  return settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []).slice(0, limit);
}
