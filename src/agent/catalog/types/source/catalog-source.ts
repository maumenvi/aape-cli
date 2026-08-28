import type { GitCatalogSource } from './git-catalog-source.ts';
import type { RegistryCatalogSource } from './registry-catalog-source.ts';
import type { WellKnownCatalogSource } from './well-known-catalog-source.ts';

/** Supported catalog source configuration variants. */
export type CatalogSource = GitCatalogSource | RegistryCatalogSource | WellKnownCatalogSource;
