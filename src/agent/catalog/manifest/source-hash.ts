import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import type { CatalogSource } from '../types/index.ts';

const FULL_GIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;

function normalizeGitUrl(url: string): string {
  return url.replace(/\.git$/i, '');
}

function resolveGitRefCommit(gitUrl: string, ref: string): string | null {
  try {
    const normalized = normalizeGitUrl(gitUrl);
    const remoteRef = ref.includes('/') ? `refs/heads/${ref}` : `refs/heads/${ref}`;
    const output = execFileSync('git', ['ls-remote', '--refs', normalized, remoteRef], {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
      timeout: 5_000,
    });
    const firstLine = output.split(/\r?\n/).find(Boolean);
    if (!firstLine) {
      return null;
    }
    const [commit] = firstLine.split(/\s+/);
    return commit && FULL_GIT_SHA_PATTERN.test(commit) ? commit.toLowerCase() : null;
  } catch {
    return null;
  }
}

export const resolveSourceCommit = (
  alias: string,
  source: CatalogSource,
): { commit: string; commitResolved: boolean } => {
  if (source.type !== 'git') {
    const revision = `${source.type}:${source.url}:${source.ref ?? 'latest'}`;
    return {
      commit: createHash('sha1').update(revision).digest('hex'),
      commitResolved: true,
    };
  }
  if (source.ref && FULL_GIT_SHA_PATTERN.test(source.ref)) {
    return { commit: source.ref.toLowerCase(), commitResolved: true };
  }
  const ref = source.ref ?? 'main';
  const resolved = source.url && /(github\.com|gitlab\.com|bitbucket\.org|\.git(?:\/)?$)/i.test(source.url)
    ? resolveGitRefCommit(source.url, ref)
    : null;
  if (resolved) {
    return { commit: resolved, commitResolved: true };
  }

  const raw = `${alias}:${source.url}:${ref}`;
  return {
    commit: createHash('sha1').update(raw).digest('hex'),
    commitResolved: false,
  };
};
