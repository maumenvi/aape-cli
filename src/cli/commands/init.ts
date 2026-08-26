import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { agentRegistry, findAgent, injectAgentConfig, resolveConfigPath } from '../../agent/agents/index.ts';
import type { AgentCatalogStore } from '../../agent/catalog/store.ts';
import type { CommandHandler } from '../types.ts';

function supportedAgentsMessage(): string {
  return agentRegistry
    .map((agent) => agent.aliases?.length ? `${agent.id} (aliases: ${agent.aliases.join(', ')})` : agent.id)
    .join(', ');
}

export function ensureInitialized(store: AgentCatalogStore): void {
  const manifest = store.loadManifest();
  store.saveManifest(manifest);
  if (!store.loadLock()) {
    store.buildLock();
  }
  mkdirSync(path.resolve(path.dirname(store.getPaths().manifest), 'skills'), { recursive: true });
  mkdirSync(path.resolve(path.dirname(store.getPaths().manifest), 'mcps'), { recursive: true });
  mkdirSync(path.resolve(path.dirname(store.getPaths().manifest), 'tools'), { recursive: true });
}

export const initCommand: CommandHandler = async (args, { store }) => {
  ensureInitialized(store);
  const agentIds = [...new Set(
    args
      .flatMap((item) => item.split(','))
      .map((item) => item.trim())
      .filter(Boolean),
  )];
  if (agentIds.length === 0) {
    console.log('Initialized aape manifest, lockfile, and skills/mcps/tools directories');
    return;
  }

  const targets = agentIds.map((agentId) => {
    const target = findAgent(agentId);
    if (!target) {
      const ids = supportedAgentsMessage();
      throw new Error(`Unknown agent "${agentId}". Supported: ${ids}`);
    }
    return target;
  });

  const uniqueTargets = [...new Map(targets.map((target) => [target.id, target])).values()];
  const cwd = process.cwd();

  console.log('Initialized aape manifest, lockfile, and skills/mcps/tools directories');
  for (const target of uniqueTargets) {
    const configPath = resolveConfigPath(target, cwd);
    const { created, updated, configPath: finalPath } = injectAgentConfig(target, cwd, configPath);
    const action = created ? 'Created' : updated ? 'Updated' : 'No change in';
    console.log(`${action} ${target.name} config: ${finalPath}`);
    console.log(`aape mcp-server registered as "aape" in ${target.name}.`);
  }
};
