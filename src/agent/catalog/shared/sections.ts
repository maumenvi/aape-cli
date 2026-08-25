import type { CatalogKind, SourcesManifest } from '../types/index.ts';

export const dependencySectionForKind = (kind: CatalogKind): keyof Pick<SourcesManifest, 'skills' | 'mcps' | 'tools'> => {
  if (kind === 'skill') return 'skills';
  if (kind === 'mcp') return 'mcps';
  return 'tools';
};
