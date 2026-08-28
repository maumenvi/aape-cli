import type { LlmAccessPolicy } from './llm-access-policy.ts';
import { normalizeAccessList } from './normalize-access-list.ts';

/** Normalizes all resource allow-lists in an LLM access policy. */
export function normalizeLlmAccessPolicy(policy?: LlmAccessPolicy): Required<LlmAccessPolicy> {
  return {
    tools: normalizeAccessList(policy?.tools, []),
    skills: normalizeAccessList(policy?.skills, []),
    mcps: normalizeAccessList(policy?.mcps, []),
  };
}
