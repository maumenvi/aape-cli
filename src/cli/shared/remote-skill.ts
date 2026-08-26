import type { CatalogSource } from '../../agent/catalog/types/index.ts';
import { createGitHubHeaders, parseGitHubRepository } from '../../agent/catalog/providers/github.ts';

const SKILL_NAME_PATTERN = /^[A-Za-z0-9._-]+$/;

interface GitHubTreeEntry {
  path?: string;
  type?: string;
}

async function fetchText(url: string): Promise<string | null> {
  const response = await fetch(url);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch skill from ${url} (${response.status})`);
  }
  return response.text();
}

function skillDirectoryName(filePath: string): string {
  const segments = filePath.split('/');
  return segments.length > 1 ? segments[segments.length - 2] : '';
}

async function discoverGitHubSkillPath(owner: string, repo: string, ref: string, name: string): Promise<string | null> {
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`;
  const response = await fetch(treeUrl, { headers: createGitHubHeaders() });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to inspect ${owner}/${repo} (${response.status})`);
  }

  const payload = await response.json() as { tree?: GitHubTreeEntry[] };
  const skillFiles = (payload.tree ?? [])
    .filter((entry) => entry.type === 'blob' && entry.path?.toLowerCase().endsWith('/skill.md'))
    .map((entry) => entry.path as string);

  return skillFiles.find((filePath) => skillDirectoryName(filePath) === name)
    ?? (skillFiles.length === 1 ? skillFiles[0] : null);
}

async function fetchGitHubSkill(source: CatalogSource, name: string): Promise<string | null> {
  const repository = parseGitHubRepository(source.url);
  if (!repository) {
    return null;
  }

  const ref = source.ref ?? 'main';
  const defaultPath = `skills/${name}/SKILL.md`;
  const rawRoot = `https://raw.githubusercontent.com/${repository.owner}/${repository.repo}/${ref}`;
  const defaultSkill = await fetchText(`${rawRoot}/${defaultPath}`);
  if (defaultSkill !== null) {
    return defaultSkill;
  }

  const discoveredPath = await discoverGitHubSkillPath(repository.owner, repository.repo, ref, name);
  return discoveredPath ? fetchText(`${rawRoot}/${discoveredPath}`) : null;
}

async function fetchWellKnownSkill(source: CatalogSource, name: string): Promise<string | null> {
  const baseUrl = source.url.replace(/\/+$/, '');
  for (const directory of ['agent-skills', 'skills']) {
    const markdown = await fetchText(`${baseUrl}/.well-known/${directory}/${name}/SKILL.md`);
    if (markdown !== null) {
      return markdown;
    }
  }
  return null;
}

export async function fetchRemoteSkillMarkdown(source: CatalogSource, name: string): Promise<string | null> {
  if (!SKILL_NAME_PATTERN.test(name)) {
    throw new Error(`Invalid skill name "${name}"`);
  }
  if (source.type === 'git') {
    return fetchGitHubSkill(source, name);
  }
  if (source.type === 'well-known') {
    return fetchWellKnownSkill(source, name);
  }
  return null;
}
