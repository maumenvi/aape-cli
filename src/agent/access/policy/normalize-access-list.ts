import { ACCESS_ALL } from './constants.ts';

/** Normalizes allow-list values and applies a fallback when empty. */
export function normalizeAccessList(list?: string[], emptyFallback: string[] = [ACCESS_ALL]): string[] {
  if (!Array.isArray(list)) return [ACCESS_ALL];
  const normalized = [...new Set(
    list
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  )];
  return normalized.length > 0 ? normalized : emptyFallback;
}
