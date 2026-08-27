import {
  searchCatalog,
  type CatalogSearchResult,
} from '../../agent/catalog/providers/index.ts';
import { AgentCatalogStore } from '../../agent/catalog/store.ts';
import { bestCatalogMatch, installCatalogResult } from '../install/external.ts';
import { selectCatalogResult } from '../shared/select.ts';
import type { CommandHandler } from '../types.ts';

type SpawnFn = (...args: unknown[]) => unknown;

const SKILL_REGISTRY_PROVIDERS = new Set(['skills.sh', 'github-skills']);

function skillsProviderId(store: AgentCatalogStore): string {
  const entry = Object.entries(store.loadManifest().registries)
    .find(([, config]) => SKILL_REGISTRY_PROVIDERS.has(config.provider));
  if (!entry) {
    throw new Error('No skill registry is configured in sources');
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
  if (query.trim()) {
    console.log('Searching skills in the catalog... this may take a few seconds.');
  }
  return searchCatalog(store.loadManifest(), 'skill', query, 20);
}

function isMissingSkillInSourceError(error: unknown): boolean {
  return error instanceof Error && /was not found in/i.test(error.message);
}

function orderedByBestMatch(results: CatalogSearchResult[], target: string): CatalogSearchResult[] {
  const best = bestCatalogMatch(results, target);
  if (!best) {
    return [];
  }
  return [best, ...results.filter((candidate) => candidate.id !== best.id)];
}

export async function runSkillsCli(
  args: string[],
  _spawnFn: SpawnFn = (() => { throw new Error('npx is not used by maia skills'); }) as SpawnFn,
  _quiet = false,
  context?: { store: AgentCatalogStore },
): Promise<number> {
  const store = context?.store ?? new AgentCatalogStore({ cwd: process.cwd() });
  const [command, ...rest] = args;

  if (command === 'find') {
    let results = await discoverSkillsFromStore(store, rest.join(' '));
    if (results.length === 0) {
      console.log('No skills were found for the provided search.');
      return 0;
    }
    while (results.length > 0) {
      const selected = await selectCatalogResult(results);
      if (!selected) {
        return 0;
      }
      try {
        await installCatalogResult(store, selected);
        console.log(`Installed skill:${selected.name}`);
        return 0;
      } catch (error) {
        if (!isMissingSkillInSourceError(error)) {
          throw error;
        }
        console.log(`Skill unavailable from source (${selected.source}). Choose another option.`);
        results = results.filter((entry) => entry.id !== selected.id);
      }
    }
    console.log('No installable skills were found for the provided search.');
    return 0;
  }

  if (command === 'add' || command === 'install') {
    const target = rest[0];
    if (!target) {
      throw new Error('Usage: maia skills add <skill-name|owner/repo@skill>');
    }
    const direct = directGitHubResult(store, target);
    if (direct) {
      await installCatalogResult(store, direct);
      console.log(`Installed skill:${direct.name}`);
      return 0;
    }

    const orderedCandidates = orderedByBestMatch(await discoverSkillsFromStore(store, target), target);
    if (orderedCandidates.length === 0) {
      throw new Error(`Skill "${target}" was not found in configured catalogs`);
    }

    let missingCount = 0;
    for (const selected of orderedCandidates) {
      try {
        await installCatalogResult(store, selected);
        console.log(`Installed skill:${selected.name}`);
        return 0;
      } catch (error) {
        if (!isMissingSkillInSourceError(error)) {
          throw error;
        }
        missingCount += 1;
      }
    }

    if (missingCount > 0) {
      throw new Error(`Skill "${target}" has catalog entries, but none are currently installable from their sources`);
    }
    throw new Error(`Skill "${target}" was not found in configured catalogs`);
    return 0;
  }

  throw new Error('Usage: maia skills find <query> | maia skills add <skill-name|owner/repo@skill>');
}

export const skillsCommand: CommandHandler = async (args, context) => {
  const code = await runSkillsCli(args, undefined, false, context);
  if (code !== 0) {
    throw new Error(`skills CLI exited with code ${code}`);
  }
};
