import type { CatalogProvider, CatalogSearchResult, ResolvedCatalogEntry } from './types.ts';
import { parseGitHubRepository, resolveGitHubSource } from './github.ts';

type FetchFn = (input: string | URL, init?: RequestInit) => Promise<Response>;

interface SkillsShResponse {
  skills?: Array<{
    id?: unknown;
    skillId?: unknown;
    name?: unknown;
    installs?: unknown;
    source?: unknown;
  }>;
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001F\u007F]/g, '').trim() : '';
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

const DEFAULT_TIMEOUT_MS = 8000;

async function fetchWithTimeout(fetchFn: FetchFn, input: string | URL, init?: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchFn(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export class SkillsShProvider implements CatalogProvider {
  readonly id: string;
  readonly kinds = ['skill'] as const;
  private readonly baseUrl: string;
  private readonly fetchFn: FetchFn;

  constructor(
    id: string,
    baseUrl: string,
    fetchFn: FetchFn = fetch,
  ) {
    this.id = id;
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.fetchFn = fetchFn;
  }

  async search(query: string, limit = 10): Promise<CatalogSearchResult[]> {
    const params = new URLSearchParams({ q: query.trim(), limit: String(limit) });
    const response = await fetchWithTimeout(this.fetchFn, `${this.baseUrl}/api/search?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`skills.sh search failed (${response.status})`);
    }

    const payload = await response.json() as SkillsShResponse;
    return (payload.skills ?? []).flatMap((skill) => {
      const id = cleanText(skill.id);
      const skillId = cleanText(skill.skillId);
      const name = cleanText(skill.name);
      const source = cleanText(skill.source);
      const canonicalName = skillId || name;
      if (!id || !canonicalName || !source) {
        return [];
      }

      const github = parseGitHubRepository(source);
      const install = github
        ? { type: 'github' as const, repository: `${github.owner}/${github.repo}`, skill: canonicalName }
        : {
            type: 'well-known' as const,
            baseUrl: /^https?:\/\//i.test(source) ? source : `https://${source}`,
            skill: canonicalName,
          };

      return [{
        id,
        kind: 'skill' as const,
        name: canonicalName,
        displayName: name || canonicalName,
        provider: this.id,
        source,
        installs: typeof skill.installs === 'number' ? skill.installs : undefined,
        install,
      }];
    });
  }

  async resolve(result: CatalogSearchResult): Promise<ResolvedCatalogEntry> {
    if (result.kind !== 'skill') {
      throw new Error(`Provider "${this.id}" cannot resolve ${result.kind} entries`);
    }

    if (result.install.type === 'github') {
      return {
        result,
        sourceAlias: `github:${result.install.repository.toLowerCase()}`,
        source: await resolveGitHubSource(result.install.repository, this.fetchFn),
      };
    }

    if (result.install.type === 'well-known') {
      const url = normalizeBaseUrl(result.install.baseUrl);
      return {
        result,
        sourceAlias: `well-known:${new URL(url).host.toLowerCase()}`,
        source: {
          type: 'well-known',
          url,
          trusted: false,
        },
      };
    }

    throw new Error(`Skill "${result.name}" does not have an installable source`);
  }
}
