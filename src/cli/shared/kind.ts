import type { CatalogKind } from '../../agent/catalog/store.ts';

export function normalizeKind(value: string): CatalogKind {
  if (value === 'skill' || value === 'mcp' || value === 'tool') {
    return value;
  }
  throw new Error(`Unsupported dependency type "${value}". Use "skill", "mcp" or "tool".`);
}
