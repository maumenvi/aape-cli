import { existsSync, readFileSync } from 'node:fs';
import { safeParseJson } from '../../shared/index.ts';
import type { CatalogKind, RegistryEntry } from '../../types/index.ts';
import { registryFileForKind } from '../root.ts';

/** Reads registry entries for a catalog kind from disk. */
export function readRegistry(kind: CatalogKind): RegistryEntry[] {
  const registryPath = registryFileForKind(kind);
  if (!existsSync(registryPath)) {
    return [];
  }
  const parsed = safeParseJson<{ items?: RegistryEntry[] }>(readFileSync(registryPath, 'utf8'), registryPath);
  return Array.isArray(parsed.items) ? parsed.items : [];
}
