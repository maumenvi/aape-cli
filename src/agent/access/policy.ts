export const ACCESS_ALL = '*';
export const ACCESS_DEFAULT_ALLOW = 'allow';
export const ACCESS_DEFAULT_DENY = 'deny';

export type AccessResourceKind = 'tool' | 'skill' | 'mcp';
export type AccessList = string[];
export type AccessDefaultPolicy = typeof ACCESS_DEFAULT_ALLOW | typeof ACCESS_DEFAULT_DENY;
export interface LlmAccessPolicy {
  tools?: string[];
  skills?: string[];
  mcps?: string[];
}

type PolicyKey = 'tools' | 'skills' | 'mcps';

const keyByKind: Record<AccessResourceKind, PolicyKey> = {
  tool: 'tools',
  skill: 'skills',
  mcp: 'mcps',
};

export function normalizeAccessList(list?: string[], emptyFallback: string[] = [ACCESS_ALL]): string[] {
  if (!Array.isArray(list)) return [ACCESS_ALL];
  const normalized = [...new Set(
    list
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  )];
  return normalized.length > 0 ? normalized : emptyFallback;
}

export function resolveAllowedLlms(
  allowedLlms: string[] | undefined,
  defaultPolicy: AccessDefaultPolicy = ACCESS_DEFAULT_ALLOW,
): string[] {
  if (Array.isArray(allowedLlms)) {
    return normalizeAccessList(allowedLlms, []);
  }
  return defaultPolicy === ACCESS_DEFAULT_DENY ? [] : [ACCESS_ALL];
}

export function normalizeLlmAccessPolicy(policy?: LlmAccessPolicy): Required<LlmAccessPolicy> {
  return {
    tools: normalizeAccessList(policy?.tools, []),
    skills: normalizeAccessList(policy?.skills, []),
    mcps: normalizeAccessList(policy?.mcps, []),
  };
}

export function listAllowsValue(list: string[], value: string): boolean {
  return list.includes(ACCESS_ALL) || list.includes(value);
}

export function canLlmAccessResource(
  llmId: string | undefined,
  kind: AccessResourceKind,
  resourceName: string,
  llmPolicy?: LlmAccessPolicy,
  resourceAllowedLlms?: string[],
  defaultPolicy: AccessDefaultPolicy = ACCESS_DEFAULT_ALLOW,
): boolean {
  const allowedLlms = resolveAllowedLlms(resourceAllowedLlms, defaultPolicy);
  if (!llmId) {
    return listAllowsValue(allowedLlms, ACCESS_ALL);
  }
  const normalizedPolicy = normalizeLlmAccessPolicy(llmPolicy);
  const allowedResources = normalizedPolicy[keyByKind[kind]];
  return listAllowsValue(allowedResources, resourceName) && listAllowsValue(allowedLlms, llmId);
}
