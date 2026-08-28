import type { GitHubRepository } from './github-repository.ts';

const GITHUB_REPOSITORY_PATTERN = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/;

/** Parses GitHub repository shorthand or URL into owner and repo parts. */
export function parseGitHubRepository(value: string): GitHubRepository | null {
  const shorthand = value.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '');
  const match = shorthand.match(GITHUB_REPOSITORY_PATTERN);
  return match ? { owner: match[1], repo: match[2] } : null;
}
