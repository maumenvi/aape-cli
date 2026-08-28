import type { CatalogKind } from '../../types/index.ts';
import type { CatalogInstall } from './catalog-install.ts';

/** Search result returned by a catalog provider. */
export interface CatalogSearchResult {
  id: string;
  kind: CatalogKind;
  name: string;
  displayName: string;
  description?: string;
  provider: string;
  source: string;
  version?: string;
  installs?: number;
  credentials?: Array<{
    name: string;
    envName?: string;
    description?: string;
    sourceUrl?: string;
  }>;
  install: CatalogInstall;
}
