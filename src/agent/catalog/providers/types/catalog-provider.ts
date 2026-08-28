import type { CatalogKind } from '../../types/index.ts';
import type { CatalogSearchResult } from './catalog-search-result.ts';
import type { ResolvedCatalogEntry } from './resolved-catalog-entry.ts';

/** Provider capable of searching and resolving catalog entries. */
export interface CatalogProvider {
  readonly id: string;
  readonly kinds: readonly CatalogKind[];

  /** Searches this provider for matching entries. */
  search(query: string, limit?: number): Promise<CatalogSearchResult[]>;

  /** Resolves a search result into an installable catalog entry. */
  resolve(result: CatalogSearchResult): Promise<ResolvedCatalogEntry>;
}
