import { agentRegistry } from './agent-registry.ts';

/** Lists the canonical ids for all supported agent targets. */
export function listAgentIds(): string[] {
  return agentRegistry.map((a) => a.id);
}
