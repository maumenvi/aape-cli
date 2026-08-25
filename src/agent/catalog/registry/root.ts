import path from 'node:path';
import { config } from '../../../config/index.ts';
import type { CatalogKind } from '../types/index.ts';

export const registryRootForKind = (kind: CatalogKind): string => {
  if (kind === 'skill') return config.paths.skillsRoot;
  if (kind === 'mcp') return config.paths.mcpRoot;
  return config.paths.toolsRoot;
};

export const registryFileForKind = (kind: CatalogKind): string => path.resolve(registryRootForKind(kind), 'registry.json');
