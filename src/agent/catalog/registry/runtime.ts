import { existsSync } from 'node:fs';
import { normalizeRegistryPath } from '../manifest/index.ts';
import type { CatalogKind } from '../types/index.ts';
import { findRegistryEntry } from './read.ts';

export function resolveRuntimeModulePath(kind: CatalogKind, name: string): string {
  const entry = findRegistryEntry(kind, name);
  if (!entry) {
    throw new Error(`${kind} "${name}" not found in registry`);
  }
  const normalized = normalizeRegistryPath(entry.path);
  if (existsSync(normalized)) {
    return normalized;
  }

  if (normalized.endsWith('.ts')) {
    const jsPath = `${normalized.slice(0, -3)}.js`;
    if (existsSync(jsPath)) {
      return jsPath;
    }
  }

  return normalized;
}
