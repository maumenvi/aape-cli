import type { CatalogKind, RegistryEntry } from '../../types/index.ts';
import { readRegistry } from './read-registry.ts';

/** Finds a registry entry by kind and package name. */
export function findRegistryEntry(kind: CatalogKind, name: string): RegistryEntry | undefined {
  const entries = readRegistry(kind);
  return entries.find((entry) => entry.name === name);
}
