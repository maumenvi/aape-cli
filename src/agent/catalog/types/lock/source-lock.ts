import type { CatalogSource } from '../source/catalog-source.ts';
import type { LockPackage } from './lock-package.ts';

/** Describes the source lock contract. */
export interface SourceLock {
  name: string;
  lockfileVersion: number;
  generatedAt: string;
  sources: Record<string, CatalogSource & { commit: string; commitResolved?: boolean }>;
  packages: Record<string, LockPackage>;
}
