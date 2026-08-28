import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { canLlmAccessResource } from '../../access/policy/can-llm-access-resource.ts';
import type { AgentCatalogStore } from '../../catalog/store/agent-catalog-store.ts';
import type { AgentTarget } from '../contracts/agent-target.ts';

/** Writes the capabilities authorized for one agent into its isolated Maia profile. */
export function writeAgentCapabilityProfile(store: AgentCatalogStore, target: AgentTarget): string {
  const paths = store.getPaths();
  const defaultPolicy = store.getLlmAccessDefault();
  const packages = store.getInstalledPackages().filter((pkg) => pkg.enabled && canLlmAccessResource(
    target.id,
    pkg.type,
    pkg.name,
    undefined,
    pkg.allowedLlms,
    defaultPolicy,
  ));
  const profileDir = path.resolve(paths.agentsDir, target.id);
  const profileFile = path.resolve(profileDir, 'capabilities.json');
  const capabilities = {
    generatedAt: new Date().toISOString(),
    agent: { id: target.id, name: target.name },
    mcpServer: target.buildEntry(paths.projectRoot, target.id),
    skills: packages.filter((pkg) => pkg.type === 'skill'),
    tools: packages.filter((pkg) => pkg.type === 'tool'),
    mcps: packages.filter((pkg) => pkg.type === 'mcp'),
  };

  mkdirSync(profileDir, { recursive: true });
  writeFileSync(profileFile, `${JSON.stringify(capabilities, null, 2)}\n`, 'utf8');
  return profileFile;
}
