import type { SourcesManifest } from '../../types/index.ts';
import type { CatalogProvider } from '../types.ts';
import { createCatalogProviders } from './create-catalog-providers.ts';

/** Finds a configured catalog provider by registry id. */
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
