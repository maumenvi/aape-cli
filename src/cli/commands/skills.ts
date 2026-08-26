import {
  searchCatalog,
  type CatalogSearchResult,
} from '../../agent/catalog/providers/index.ts';
import { AgentCatalogStore } from '../../agent/catalog/store.ts';
import { bestCatalogMatch, installCatalogResult } from '../install/external.ts';
import { selectCatalogResult } from '../shared/select.ts';
import type { CommandHandler } from '../types.ts';

type SpawnFn = (...args: unknown[]) => unknown;

function skillsProviderId(store: AgentCatalogStore): string {
  const entry = Object.entries(store.loadManifest().registries)
    .find(([, config]) => config.provider === 'skills.sh');
  if (!entry) {
    throw new Error('No skills.sh registry is configured in sources');
  }
  return entry[0];
}

function directGitHubResult(store: AgentCatalogStore, target: string): CatalogSearchResult | null {
  const match = target.match(/^([^/]+\/[^/@]+)@([A-Za-z0-9._-]+)$/);
  if (!match) {
    return null;
  }
  const [, repository, name] = match;
  return {
    id: `${repository}/${name}`,
    kind: 'skill',
    name,
    displayName: name,
    provider: skillsProviderId(store),
    source: repository,
    install: { type: 'github', repository, skill: name },
  };
}

export async function discoverSkillsFromStore(
  store: AgentCatalogStore,
  query = '',
): Promise<CatalogSearchResult[]> {
  return searchCatalog(store.loadManifest(), 'skill', query, 20);
}

async function resolveRequestedSkill(store: AgentCatalogStore, target: string): Promise<CatalogSearchResult | null> {
  const direct = directGitHubResult(store, target);
  if (direct) {
    return direct;
  }
  return bestCatalogMatch(await discoverSkillsFromStore(store, target), target);
}

export async function runSkillsCli(
  args: string[],
  _spawnFn: SpawnFn = (() => { throw new Error('npx is not used by aape skills'); }) as SpawnFn,
  _quiet = false,
  context?: { store: AgentCatalogStore },
): Promise<number> {
  const store = context?.store ?? new AgentCatalogStore({ cwd: process.cwd() });
  const [command, ...rest] = args;

  if (command === 'find') {
    const results = await discoverSkillsFromStore(store, rest.join(' '));
    if (results.length === 0) {
      console.log('Nenhuma skill encontrada para a busca informada.');
      return 0;
    }
    const selected = await selectCatalogResult(results);
    if (selected) {
      await installCatalogResult(store, selected);
      console.log(`Installed skill:${selected.name}`);
    }
    return 0;
  }

  if (command === 'add' || command === 'install') {
    const target = rest[0];
    if (!target) {
      throw new Error('Usage: aape skills add <skill-name|owner/repo@skill>');
    }
    const selected = await resolveRequestedSkill(store, target);
    if (!selected) {
      throw new Error(`Skill "${target}" was not found in configured catalogs`);
    }
    await installCatalogResult(store, selected);
    console.log(`Installed skill:${selected.name}`);
    return 0;
  }

  throw new Error('Usage: aape skills find <query> | aape skills add <skill-name|owner/repo@skill>');
}

export const skillsCommand: CommandHandler = async (args, context) => {
  const code = await runSkillsCli(args, undefined, false, context);
  if (code !== 0) {
    throw new Error(`skills CLI exited with code ${code}`);
  }
};
