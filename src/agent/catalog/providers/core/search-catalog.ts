import type { CatalogKind } from '../../types/kinds.ts';
import type { SourcesManifest } from '../../types/manifest/sources-manifest.ts';
import type { CatalogSearchResult } from '../contracts/catalog-search-result.ts';
import { createCatalogProviders } from './create-catalog-providers.ts';

/** Performs the search catalog operation. */
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
