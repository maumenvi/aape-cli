import { existsSync, readFileSync } from 'node:fs';
import { safeParseJson } from '../shared/index.ts';
import type { CatalogKind, RegistryEntry } from '../types/index.ts';
import { registryFileForKind } from './root.ts';

export function readRegistry(kind: CatalogKind): RegistryEntry[] {
  const registryPath = registryFileForKind(kind);
  if (!existsSync(registryPath)) {
    return [];
  }
  const parsed = safeParseJson<{ items?: RegistryEntry[] }>(readFileSync(registryPath, 'utf8'), registryPath);
  return Array.isArray(parsed.items) ? parsed.items : [];
}

export function findRegistryEntry(kind: CatalogKind, name: string): RegistryEntry | undefined {
  const entries = readRegistry(kind);
  return entries.find((entry) => entry.name === name);
}
