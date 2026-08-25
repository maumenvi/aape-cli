import path from 'node:path';
import type { CatalogStoreOptions } from '../types/index.ts';

export function resolveManifestAndLockPaths(options: CatalogStoreOptions = {}) {
  const cwd = options.cwd ?? process.cwd();
  return {
    manifest: path.resolve(cwd, options.manifestFile ?? 'sources'),
    lock: path.resolve(cwd, options.lockFile ?? 'source.lock'),
  };
}
