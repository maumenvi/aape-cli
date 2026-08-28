import type { CatalogKind } from '../../agent/catalog/types/kinds.ts';

/** Performs the normalize kind operation. */
export function normalizeKind(value: string): CatalogKind {
  if (value === 'skill' || value === 'mcp' || value === 'tool') {
    return value;
  }
  throw new Error(`Unsupported dependency type "${value}". Use "skill", "mcp" or "tool".`);
}
