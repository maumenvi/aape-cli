import type { AccessDefaultPolicy } from './access-default-policy.ts';
import { ACCESS_ALL, ACCESS_DEFAULT_ALLOW, ACCESS_DEFAULT_DENY } from './constants.ts';
import { normalizeAccessList } from './normalize-access-list.ts';

/** Resolves a resource-level LLM allow-list from config and defaults. */
export function resolveAllowedLlms(
  allowedLlms: string[] | undefined,
  defaultPolicy: AccessDefaultPolicy = ACCESS_DEFAULT_ALLOW,
): string[] {
  if (Array.isArray(allowedLlms)) {
    return normalizeAccessList(allowedLlms, []);
  }
  return defaultPolicy === ACCESS_DEFAULT_DENY ? [] : [ACCESS_ALL];
}
