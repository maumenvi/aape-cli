import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import path from 'node:path';
import { agentRegistry, findAgent, injectAgentConfig, resolveConfigPath } from '../../agent/agents/index.ts';
import type { AgentCatalogStore } from '../../agent/catalog/store.ts';
import type { CommandHandler } from '../types.ts';

const AGENT_GUIDANCE_MARKER = '<!-- aape-capability-discovery -->';
const AGENT_GUIDANCE_TEXT = `
${AGENT_GUIDANCE_MARKER}
## Aape capability discovery

Use the Aape CLI as the authoritative source of truth for skills, tools, and MCP servers.

Before assuming a capability exists, query it with:

\`\`\`bash
 aape list-capabilities --json
 aape list-tools --json
 aape list-skills --json
\`\`\`

The project may register capabilities in the manifest while the active agent runtime only exposes a subset. Always prefer the CLI inventory for discovery.

The built-in MCP server should also expose these discovery tools with clear descriptions so downstream agents can call them automatically without repeated prompting.
`;

function supportedAgentsMessage(): string {
  return agentRegistry
    .map((agent) => agent.aliases?.length ? `${agent.id} (aliases: ${agent.aliases.join(', ')})` : agent.id)
    .join(', ');
}

export function normalizeAgentIds(agentIds: string[]): string[] {
  return [...new Set(
    agentIds
      .flatMap((item) => item.split(/[\s,]+/))
      .map((item) => item.trim())
      .filter(Boolean),
  )];
}

export function parseSaveFlag(args: string[]): { save: boolean; remaining: string[] } {
  const remaining: string[] = [];
  let save = false;

  for (const token of args) {
    if (token === '-save' || token === '--save') {
      save = true;
      continue;
    }
    remaining.push(token);
  }

  return { save, remaining };
}

export function parseAgentSelection(input: string): string[] {
  const tokens = input
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return [];
  }

  const selected = new Set<string>();
  const byName = new Map<string, string>();
  for (const agent of agentRegistry) {
    byName.set(agent.id, agent.id);
    for (const alias of agent.aliases ?? []) {
      byName.set(alias, agent.id);
    }
  }

  for (const token of tokens) {
    const normalized = token.toLowerCase();
    if (normalized === 'all' || normalized === '*') {
      for (const agent of agentRegistry) {
        selected.add(agent.id);
      }
      continue;
    }

    const numericIndex = Number(token);
    if (Number.isInteger(numericIndex) && numericIndex >= 1 && numericIndex <= agentRegistry.length) {
      selected.add(agentRegistry[numericIndex - 1].id);
      continue;
    }

    const mapped = byName.get(normalized);
    if (mapped) {
      selected.add(mapped);
      continue;
    }

    throw new Error(`Unknown agent "${token}". Supported: ${supportedAgentsMessage()}`);
  }

  return [...selected];
}

export async function promptForAgentIds(): Promise<string[]> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return [];
  }

  console.log('Select one or more agents to configure:');
  agentRegistry.forEach((agent, index) => {
    const aliases = agent.aliases?.length ? ` (aliases: ${agent.aliases.join(', ')})` : '';
    console.log(`  ${index + 1}. ${agent.id}${aliases}`);
  });

  const input = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await input.question('\nEnter numbers/names separated by commas (e.g. 1,3 or claude,copilot), or press Enter to skip: ')).trim();
    if (!answer) {
      return [];
    }
    return parseAgentSelection(answer);
  } finally {
    input.close();
  }
}

function ensureAgentGuidanceFile(targetPath: string): void {
  const template = AGENT_GUIDANCE_TEXT;
  const fileExists = existsSync(targetPath);
  const current = fileExists ? readFileSync(targetPath, 'utf8') : '';

  if (!current.includes(AGENT_GUIDANCE_MARKER)) {
    const next = fileExists ? `${current.trimEnd()}\n\n${template}\n` : `${template}\n`;
    writeFileSync(targetPath, next, 'utf8');
    return;
  }

  const replacement = new RegExp(`${AGENT_GUIDANCE_MARKER}[\\s\\S]*?(?=\\n*# |$)`, 'm');
  const updated = current.replace(replacement, template.trim());
  writeFileSync(targetPath, updated, 'utf8');
}

export function ensureInitialized(store: AgentCatalogStore): void {
  const manifest = store.loadManifest();
  store.saveManifest(manifest);
  if (!store.loadLock()) {
    store.buildLock();
  }

  const root = path.dirname(store.getPaths().manifest);
  const files = ['AGENTS.md', 'AGENT.md'];
  for (const file of files) {
    ensureAgentGuidanceFile(path.join(root, file));
  }
}

export const initCommand: CommandHandler = async (args, { store }) => {
  ensureInitialized(store);

  const { save, remaining } = parseSaveFlag(args);
  const explicitAgentIds = normalizeAgentIds(remaining);
  const agentIds = explicitAgentIds.length > 0 ? explicitAgentIds : await promptForAgentIds();

  if (agentIds.length === 0) {
    if (save) {
      store.saveSelectedAgents([]);
    }
    console.log('Initialized aape manifest, lockfile, and agent guidance files');
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

  if (save) {
    store.saveSelectedAgents(uniqueTargets.map((target) => target.id));
  }

  console.log('Initialized aape manifest, lockfile, and agent guidance files');
  let applied = false;
  for (const target of uniqueTargets) {
    const configPath = resolveConfigPath(target, cwd);
    if (!configPath.startsWith(`${cwd}${path.sep}`) && configPath !== cwd) {
      console.log(`Skipping ${target.name} config injection: this project is local-only and does not modify global agent configs.`);
      continue;
    }

    const { created, updated, configPath: finalPath } = injectAgentConfig(target, cwd, configPath);
    const action = created ? 'Created' : updated ? 'Updated' : 'No change in';
    console.log(`${action} ${target.name} config: ${finalPath}`);
    console.log(`aape mcp-server registered as "aape" in ${target.name}.`);
    applied = true;
  }

  if (!applied) {
    console.log('No global agent config was modified. Aape is configured for local project management only.');
  }
};
