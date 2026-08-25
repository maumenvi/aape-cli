import type { CatalogKind, RegistryEntry } from '../types/index.ts';
import { readRegistry } from './read.ts';

export function discoverRegistryEntries(kind: CatalogKind, query = '', limit = 10): RegistryEntry[] {
  const entries = readRegistry(kind);
  const search = query.trim().toLowerCase();
  const filtered = search
    ? entries.filter((entry) => `${entry.name} ${entry.description}`.toLowerCase().includes(search))
    : entries;
  return filtered.slice(0, limit);
}
