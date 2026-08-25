import type { RegistryEntry } from '../types/index.ts';

export const mapDiscoverEntries = (entries: RegistryEntry[]) => entries.map((entry) => ({
  name: entry.name,
  description: entry.description,
  source: entry.source ?? 'local',
  allowedLlms: entry.allowedLlms,
}));
