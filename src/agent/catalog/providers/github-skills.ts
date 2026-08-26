import type { CatalogProvider, CatalogSearchResult, ResolvedCatalogEntry } from './types.ts';
import { resolveGitHubSource } from './github.ts';

type FetchFn = (input: string | URL, init?: RequestInit) => Promise<Response>;

interface GitHubCodeSearchResponse {
  items?: Array<{
    path?: unknown;
    repository?: {
      full_name?: unknown;
    };
  }>;
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001F\u007F]/g, '').trim() : '';
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function parseSkillNameFromPath(value: string): string | null {
  const parts = value.split('/').filter(Boolean);
  if (parts.length < 2) {
    return null;
  }

  const fileName = parts.at(-1)?.toLowerCase();
  if (fileName !== 'skill.md') {
    return null;
  }

  const candidate = parts.at(-2) ?? '';
  return /^[A-Za-z0-9._-]+$/.test(candidate) ? candidate : null;
}

export class GitHubSkillsProvider implements CatalogProvider {
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
    const trimmedQuery = query.trim();
    const q = trimmedQuery ? `${trimmedQuery} filename:SKILL.md` : 'filename:SKILL.md';
    const params = new URLSearchParams({ q, per_page: String(limit) });
    const response = await this.fetchFn(`${this.baseUrl}/search/code?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`GitHub skills search failed (${response.status})`);
    }

    const payload = await response.json() as GitHubCodeSearchResponse;
    const deduped = new Map<string, CatalogSearchResult>();
    for (const item of payload.items ?? []) {
      const source = cleanText(item.repository?.full_name);
      const path = cleanText(item.path);
      const name = parseSkillNameFromPath(path);
      if (!source || !name) {
        continue;
      }

      const id = `${source}/${name}`;
      deduped.set(id, {
        id,
        kind: 'skill',
        name,
        displayName: name,
        provider: this.id,
        source,
        install: { type: 'github', repository: source, skill: name },
      });
    }

    return Array.from(deduped.values());
  }

  async resolve(result: CatalogSearchResult): Promise<ResolvedCatalogEntry> {
    if (result.kind !== 'skill' || result.install.type !== 'github') {
      throw new Error(`Provider "${this.id}" cannot resolve this entry`);
    }

    return {
      result,
      sourceAlias: `github:${result.install.repository.toLowerCase()}`,
      source: await resolveGitHubSource(result.install.repository, this.fetchFn),
    };
  }
}
