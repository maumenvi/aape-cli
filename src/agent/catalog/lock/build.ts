import { resolveSourceCommit } from '../manifest/index.ts';
import { findRegistryEntry } from '../registry/index.ts';
import { dependencySectionForKind, packageKey } from '../shared/index.ts';
import type { CatalogKind, SourceLock, SourcesManifest } from '../types/index.ts';
import { createPackageDescriptor } from './package-descriptor.ts';

export function buildLockFromManifest(manifest: SourcesManifest, workspaceRoot = process.cwd()): SourceLock {
  const defaultAccessPolicy = manifest.config.llmAccessDefault;
  const strictVerify = manifest.config.strictVerify;
  const referencedSources = new Set([
    ...Object.values(manifest.skills),
    ...Object.values(manifest.mcps),
    ...Object.values(manifest.tools),
  ].map((dependency) => dependency.source));
  const sources: SourceLock['sources'] = {};
  for (const [alias, source] of Object.entries(manifest.sources)) {
    const resolvedCommit = resolveSourceCommit(alias, source);
    if (strictVerify && source.type === 'git' && referencedSources.has(alias) && !resolvedCommit.commitResolved) {
      throw new Error(`Unable to resolve commit for source "${alias}" while strictVerify is enabled`);
    }
    sources[alias] = {
      ...source,
      commit: resolvedCommit.commit,
      commitResolved: resolvedCommit.commitResolved,
    };
  }

  const packages: SourceLock['packages'] = {};
  const buildPackagesForKind = (kind: CatalogKind) => {
    const section = dependencySectionForKind(kind);
    for (const [name, dependency] of Object.entries(manifest[section])) {
      if (!(dependency.source in sources)) {
        throw new Error(`Unknown source "${dependency.source}" for ${kind} "${name}"`);
      }

      const sourceInfo = sources[dependency.source];
      const registryEntry = findRegistryEntry(kind, name);
      const descriptor = createPackageDescriptor(
        kind,
        name,
        dependency,
        sourceInfo,
        registryEntry,
        defaultAccessPolicy,
        workspaceRoot,
      );
      packages[packageKey(kind, name)] = descriptor;
    }
  };

  buildPackagesForKind('skill');
  buildPackagesForKind('mcp');
  buildPackagesForKind('tool');

  return {
    name: manifest.name,
    lockfileVersion: 1,
    generatedAt: new Date().toISOString(),
    sources,
    packages,
  };
}
