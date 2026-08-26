import path from 'node:path';
import { agentRegistry, findAgent, injectAgentConfig, resolveConfigPath } from '../../agent/agents/index.ts';
import { parseSaveFlag } from './init.ts';
import type { CommandHandler } from '../types.ts';

function isProjectLocalConfig(configPath: string, cwd: string): boolean {
  const resolvedCwd = path.resolve(cwd);
  const resolvedConfig = path.resolve(configPath);
  return resolvedConfig === resolvedCwd || resolvedConfig.startsWith(`${resolvedCwd}${path.sep}`);
}

function supportedAgentsMessage(): string {
  return agentRegistry
    .map((agent) => agent.aliases?.length ? `${agent.id} (aliases: ${agent.aliases.join(', ')})` : agent.id)
    .join(', ');
}

function normalizeAgentIds(agentIds: string[]): string[] {
  const ids = agentIds
    .flatMap((item) => item.split(','))
    .map((item) => item.trim())
    .filter(Boolean);
  return [...new Set(ids)];
}

function resolveTargets(agentIds: string[]) {
  const ids = normalizeAgentIds(agentIds);
  if (ids.length === 0) {
    const supported = supportedAgentsMessage();
    throw new Error(`Supported agents: ${supported}`);
  }

  const targets = ids.map((agentId) => {
    const target = findAgent(agentId);
    if (!target) {
      const supported = supportedAgentsMessage();
      throw new Error(`Unknown agent "${agentId}". Supported: ${supported}`);
    }
    return target;
  });

  return [...new Map(targets.map((target) => [target.id, target])).values()];
}

function configureAgents(agentIds: string[]): void {
  const targets = resolveTargets(agentIds);
  const cwd = process.cwd();

  let applied = false;
  for (const target of targets) {
    const configPath = resolveConfigPath(target, cwd);
    if (!isProjectLocalConfig(configPath, cwd)) {
      console.log(`Skipping ${target.name} config injection: this project is local-only and does not modify global agent configs.`);
      continue;
    }

    const { created, updated, configPath: finalPath } = injectAgentConfig(target, cwd, configPath);
    const action = created ? 'Created' : updated ? 'Updated' : 'No change in';
    console.log(`${action} ${target.name} config: ${finalPath}`);
    console.log(`aape mcp-server registered as "aape" in ${target.name}.`);
    if (target.id !== 'copilot') {
      console.log('Restart the agent/app to pick up the new MCP server.');
    }
    applied = true;
  }

  if (!applied) {
    console.log('No global agent config was modified. Aape is configured for local project management only.');
  }
}

export const agentCommand: CommandHandler = async (args, { store }) => {
  const { save, remaining } = parseSaveFlag(args);
  const action = remaining[0];

  if (action === 'agent') {
    const agentIds = remaining.slice(1);
    if (agentIds.length === 0) {
      const ids = supportedAgentsMessage();
      throw new Error(`Usage: aape add agent <name...>\nSupported agents: ${ids}`);
    }
    configureAgents(agentIds);
    if (save) {
      store.saveSelectedAgents(agentIds);
    }
    return;
  }

  if (action === 'add') {
    const agentIds = remaining.slice(1);
    if (agentIds.length === 0) {
      const ids = supportedAgentsMessage();
      throw new Error(`Usage: aape agent add <name...>\nSupported agents: ${ids}`);
    }
    configureAgents(agentIds);
    if (save) {
      store.saveSelectedAgents(agentIds);
    }
    return;
  }

  if (action && action !== 'ls' && action !== 'list') {
    configureAgents(remaining);
    if (save) {
      store.saveSelectedAgents(remaining);
    }
    return;
  }

  if (action === 'ls' || action === 'list') {
    console.log('Supported agents:');
    for (const agent of agentRegistry) {
      const aliases = agent.aliases?.length ? ` (aliases: ${agent.aliases.join(', ')})` : '';
      console.log(`  ${agent.id}${aliases}`);
    }
    return;
  }

  throw new Error('Usage: aape agent add <name...> | aape add agent <name...> | aape add <name...> | aape agent ls');
};
