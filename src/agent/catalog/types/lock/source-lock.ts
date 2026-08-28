import type { CatalogSource } from '../source.ts';
import type { LockPackage } from './lock-package.ts';

/** Complete source lockfile content for catalog dependencies. */
export interface SourceLock {
  name: string;
  lockfileVersion: number;
  generatedAt: string;
  sources: Record<string, CatalogSource & { commit: string; commitResolved?: boolean }>;
  packages: Record<string, LockPackage>;
}
