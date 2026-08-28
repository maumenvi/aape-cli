import type { CatalogSource } from '../../types/index.ts';
import type { CatalogSearchResult } from './catalog-search-result.ts';

/** Catalog result paired with the source selected for installation. */
export interface ResolvedCatalogEntry {
  result: CatalogSearchResult;
  sourceAlias: string;
  source: CatalogSource;
}
