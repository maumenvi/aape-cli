import { dependencySectionForKind } from '../shared/index.ts';
import type { CatalogKind, SourcesManifest } from '../types/index.ts';

export function setManifestDependency(
  manifest: SourcesManifest,
  kind: CatalogKind,
  name: string,
  dependency: SourcesManifest['skills'][string] | SourcesManifest['mcps'][string] | SourcesManifest['tools'][string],
): SourcesManifest {
  if (kind === 'skill') {
    manifest.skills[name] = dependency as SourcesManifest['skills'][string];
  } else if (kind === 'mcp') {
    manifest.mcps[name] = dependency as SourcesManifest['mcps'][string];
  } else {
    manifest.tools[name] = dependency as SourcesManifest['tools'][string];
  }
  return manifest;
}

export function removeManifestDependency(manifest: SourcesManifest, kind: CatalogKind, name: string): SourcesManifest {
  const section = dependencySectionForKind(kind);
  delete manifest[section][name];
  return manifest;
}
