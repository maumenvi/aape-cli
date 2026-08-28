import type { RegistryEntry } from '../types/registry.ts';

/** Performs the map discover entries operation. */
export const mapDiscoverEntries = (entries: RegistryEntry[]) => entries.map((entry) => ({
  name: entry.name,
  description: entry.description,
  source: entry.source ?? 'local',
  allowedLlms: entry.allowedLlms,
}));
