import type { CatalogStoreOptions, CatalogStorePaths } from '../types/index.ts';
import { resolveContextPaths } from './context-paths.ts';
import { resolveManifestAndLockPaths } from './manifest-lock.ts';

export function resolveCatalogPaths(options: CatalogStoreOptions = {}): CatalogStorePaths {
  const { manifest, lock } = resolveManifestAndLockPaths(options);
  const context = resolveContextPaths(manifest);

  return {
    manifest,
    lock,
    contextDir: context.contextDir,
    contextDev: context.contextDev,
    contextLlm: context.contextLlm,
    vscodeMcp: context.vscodeMcp,
  };
}
