import { dependencySectionForKind } from '../../shared/index.ts';
import type { CatalogKind, SourcesManifest } from '../../types/index.ts';

/** Removes a dependency from the manifest section for its catalog kind. */
export function removeManifestDependency(manifest: SourcesManifest, kind: CatalogKind, name: string): SourcesManifest {
  const section = dependencySectionForKind(kind);
  delete manifest[section][name];
  return manifest;
}
