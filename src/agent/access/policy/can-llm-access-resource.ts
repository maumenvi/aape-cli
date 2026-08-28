import type { AccessDefaultPolicy } from './access-default-policy.ts';
import type { AccessResourceKind } from './access-resource-kind.ts';
import type { LlmAccessPolicy } from './llm-access-policy.ts';
import { ACCESS_ALL, ACCESS_DEFAULT_ALLOW } from './constants.ts';
import { listAllowsValue } from './list-allows-value.ts';
import { normalizeLlmAccessPolicy } from './normalize-llm-access-policy.ts';
import { resolveAllowedLlms } from './resolve-allowed-llms.ts';

type PolicyKey = 'tools' | 'skills' | 'mcps';

const keyByKind: Record<AccessResourceKind, PolicyKey> = {
  tool: 'tools',
  skill: 'skills',
  mcp: 'mcps',
};

/** Checks whether an LLM may access a named tool, skill, or MCP resource. */
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
