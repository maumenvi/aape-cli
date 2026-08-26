import type { GitCatalogSource } from '../types/index.ts';

type FetchFn = (input: string | URL, init?: RequestInit) => Promise<Response>;

const GITHUB_REPOSITORY_PATTERN = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/;

export interface GitHubRepository {
  owner: string;
  repo: string;
}

export function parseGitHubRepository(value: string): GitHubRepository | null {
  const shorthand = value.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '');
  const match = shorthand.match(GITHUB_REPOSITORY_PATTERN);
  return match ? { owner: match[1], repo: match[2] } : null;
}

export function createGitHubHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  return {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'aape-cli',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchGitHubJson<T>(url: string, fetchFn: FetchFn): Promise<T> {
  const response = await fetchFn(url, { headers: createGitHubHeaders() });
  if (!response.ok) {
    throw new Error(`GitHub request failed (${response.status}): ${url}`);
  }
  return response.json() as Promise<T>;
}

export async function resolveGitHubSource(repository: string, fetchFn: FetchFn = fetch): Promise<GitCatalogSource> {
  const parsed = parseGitHubRepository(repository);
  if (!parsed) {
    throw new Error(`Invalid GitHub repository "${repository}"`);
  }

  const apiRoot = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`;
  const repositoryData = await fetchGitHubJson<{ default_branch?: string }>(apiRoot, fetchFn);
  const branch = repositoryData.default_branch || 'main';
  const commitData = await fetchGitHubJson<{ sha?: string }>(`${apiRoot}/commits/${encodeURIComponent(branch)}`, fetchFn);
  if (!commitData.sha || !/^[0-9a-f]{40}$/i.test(commitData.sha)) {
    throw new Error(`GitHub did not return a valid commit for ${repository}`);
  }

  return {
    type: 'git',
    url: `https://github.com/${parsed.owner}/${parsed.repo}.git`,
    ref: commitData.sha.toLowerCase(),
    trusted: false,
  };
}
