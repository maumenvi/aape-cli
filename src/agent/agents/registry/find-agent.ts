import type { AgentTarget } from '../types.ts';
import { agentRegistry } from './agent-registry.ts';

/** Finds an agent target by id or alias. */
export function findAgent(id: string): AgentTarget | undefined {
  const normalized = id.toLowerCase();
  return agentRegistry.find((agent) => agent.id === normalized || agent.aliases?.includes(normalized));
}
