import { createHash } from 'node:crypto';
import type { CatalogSource } from '../types/index.ts';

const FULL_GIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;

export const resolveSourceCommit = (
  alias: string,
  source: CatalogSource,
): { commit: string; commitResolved: boolean } => {
  if (source.ref && FULL_GIT_SHA_PATTERN.test(source.ref)) {
    return { commit: source.ref.toLowerCase(), commitResolved: true };
  }

  const raw = `${alias}:${source.url}:${source.ref ?? 'main'}`;
  return {
    commit: createHash('sha1').update(raw).digest('hex'),
    commitResolved: false,
  };
};
