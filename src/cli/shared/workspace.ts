import {
  closeSync,
  constants,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { syncVsCodeMcpConfig } from '../../agent/catalog/context/index.ts';
import { resolveRuntimeModulePath } from '../../agent/catalog/registry/index.ts';
import type { LockPackage, SourceLock } from '../../agent/catalog/types/index.ts';
import type { AgentCatalogStore } from '../../agent/catalog/store.ts';
import type { CatalogSource } from '../../agent/catalog/types/index.ts';
import { ensureLockMcpEnvFileEntries } from '../install/mcp-credentials.ts';
import { fetchRemoteSkillMarkdown } from './remote-skill.ts';

export { fetchRemoteSkillMarkdown } from './remote-skill.ts';

function assertWorkspaceRelativePath(workspaceRoot: string, targetRelativePath: string, label: string): string {
  const candidate = targetRelativePath.trim();
  if (!candidate || candidate === '.' || candidate === '/' || candidate.startsWith('/')) {
    throw new Error(`Invalid ${label}: ${targetRelativePath}`);
  }
  const normalized = candidate.replace(/\\/g, '/');
  if (normalized.startsWith('../') || normalized === '..' || /(^|\/)(\.\.)($|\/)/.test(normalized)) {
    throw new Error(`Invalid ${label}: ${targetRelativePath}`);
  }
  const resolved = path.resolve(workspaceRoot, normalized);
  const relative = path.relative(workspaceRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Invalid ${label}: ${targetRelativePath}`);
  }
  return resolved;
}

function assertMaterializedPath(
  workspaceRoot: string,
  targetRelativePath: string,
  label: string,
  allowedPrefix: string,
): string {
  const resolved = assertWorkspaceRelativePath(workspaceRoot, targetRelativePath, label);
  const relative = path.relative(workspaceRoot, resolved).replace(/\\/g, '/');
  if (relative !== allowedPrefix && !relative.startsWith(`${allowedPrefix}/`)) {
    throw new Error(`Invalid ${label}: ${targetRelativePath}`);
  }
  return resolved;
}

function lstatIfPresent(candidate: string): ReturnType<typeof lstatSync> | null {
  try {
    return lstatSync(candidate);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function assertNoSymlinkTraversal(workspaceRoot: string, targetPath: string, label: string): void {
  const root = path.resolve(workspaceRoot);
  const rootStats = lstatIfPresent(root);
  if (!rootStats?.isDirectory() || rootStats.isSymbolicLink()) {
    throw new Error(`Unsafe ${label}: workspace root must be a real directory`);
  }

  const relative = path.relative(root, targetPath);
  let current = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    const stats = lstatIfPresent(current);
    if (stats?.isSymbolicLink()) {
      throw new Error(`Unsafe ${label}: symbolic links are not allowed in materialized paths (${current})`);
    }
  }
}

function writeMaterializedFile(
  workspaceRoot: string,
  targetPath: string,
  label: string,
  content: string,
): void {
  assertNoSymlinkTraversal(workspaceRoot, targetPath, label);
  mkdirSync(path.dirname(targetPath), { recursive: true });
  assertNoSymlinkTraversal(workspaceRoot, targetPath, label);

  const realRoot = realpathSync(workspaceRoot);
  const realParent = realpathSync(path.dirname(targetPath));
  const realRelative = path.relative(realRoot, realParent);
  if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
    throw new Error(`Unsafe ${label}: materialized path resolves outside the workspace`);
  }

  const noFollow = typeof constants.O_NOFOLLOW === 'number' ? constants.O_NOFOLLOW : 0;
  const fd = openSync(
    targetPath,
    constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | noFollow,
    0o666,
  );
  try {
    writeFileSync(fd, content, 'utf8');
  } finally {
    closeSync(fd);
  }
}

export function resolveWorkspaceRoot(store: Pick<AgentCatalogStore, 'getPaths'>): string {
  return path.dirname(store.getPaths().manifest);
}

export function resolveSkillsDir(store: Pick<AgentCatalogStore, 'getPaths'>): string {
  return path.resolve(resolveWorkspaceRoot(store), 'skills');
}

export function resolveToolsDir(store: Pick<AgentCatalogStore, 'getPaths'>): string {
  return path.resolve(resolveWorkspaceRoot(store), 'tools');
}

export function resolveSkillTargetPath(store: Pick<AgentCatalogStore, 'getPaths'>, name: string, sourcePath: string): string {
  const extension = path.extname(sourcePath) || '.ts';
  return path.resolve(resolveSkillsDir(store), `${name}${extension}`);
}

export function resolveToolTargetPath(store: Pick<AgentCatalogStore, 'getPaths'>, name: string, sourcePath: string): string {
  const extension = path.extname(sourcePath) === '.ts' ? '.ts' : '.mjs';
  return path.resolve(resolveToolsDir(store), `${name}${extension}`);
}

export function materializeSkill(store: Pick<AgentCatalogStore, 'getPaths'>, name: string, targetRelativePath?: string): string {
  const sourcePath = resolveRuntimeModulePath('skill', name);
  const workspaceRoot = resolveWorkspaceRoot(store);
  const targetPath = targetRelativePath
    ? assertMaterializedPath(workspaceRoot, targetRelativePath, 'skill target path', 'skills')
    : resolveSkillTargetPath(store, name, sourcePath);
  writeMaterializedFile(workspaceRoot, targetPath, 'skill target path', readFileSync(sourcePath, 'utf8'));
  return targetPath;
}

export function materializeSkillFromLock(store: Pick<AgentCatalogStore, 'getPaths'>, pkg: Pick<LockPackage, 'name' | 'path'>): string {
  return materializeSkill(store, pkg.name, pkg.path);
}

export function materializeTool(store: Pick<AgentCatalogStore, 'getPaths'>, name: string, targetRelativePath?: string): string {
  const sourcePath = resolveRuntimeModulePath('tool', name);
  const workspaceRoot = resolveWorkspaceRoot(store);
  const targetPath = targetRelativePath
    ? assertMaterializedPath(workspaceRoot, targetRelativePath, 'tool target path', 'tools')
    : resolveToolTargetPath(store, name, sourcePath);
  writeMaterializedFile(workspaceRoot, targetPath, 'tool target path', readFileSync(sourcePath, 'utf8'));
  return targetPath;
}

export function materializeToolFromLock(store: Pick<AgentCatalogStore, 'getPaths'>, pkg: Pick<LockPackage, 'name' | 'path'>): string {
  return materializeTool(store, pkg.name, pkg.path);
}

export async function materializeRemoteSkill(
  store: Pick<AgentCatalogStore, 'getPaths'>,
  name: string,
  source: CatalogSource,
  targetRelativePath = path.posix.join('skills', name, 'SKILL.md'),
): Promise<string> {
  const markdown = await fetchRemoteSkillMarkdown(source, name);
  if (markdown === null) {
    throw new Error(`Skill "${name}" was not found in ${source.url}`);
  }

  const workspaceRoot = resolveWorkspaceRoot(store);
  const targetPath = assertMaterializedPath(workspaceRoot, targetRelativePath, 'skill target path', 'skills');
  writeMaterializedFile(workspaceRoot, targetPath, 'skill target path', markdown);
  return targetPath;
}

export async function reinstallFromLock(store: Pick<AgentCatalogStore, 'getPaths'>, lock: SourceLock): Promise<{ skills: string[]; vscodeMcp?: string }> {
  const workspaceRoot = resolveWorkspaceRoot(store);
  for (const pkg of Object.values(lock.packages)) {
    if (!pkg.enabled || !pkg.path) continue;
    if (pkg.type === 'skill') {
      const targetPath = assertMaterializedPath(workspaceRoot, pkg.path, 'skill target path', 'skills');
      assertNoSymlinkTraversal(workspaceRoot, targetPath, 'skill target path');
    }
    if (pkg.type === 'tool') {
      const targetPath = assertMaterializedPath(workspaceRoot, pkg.path, 'tool target path', 'tools');
      assertNoSymlinkTraversal(workspaceRoot, targetPath, 'tool target path');
    }
  }

  const skills = await Promise.all(
    Object.values(lock.packages)
      .filter((pkg) => pkg.type === 'skill' && pkg.enabled)
      .map(async (pkg) => {
        if (pkg.path.toLowerCase().endsWith('skill.md')) {
          const source = lock.sources[pkg.source];
          if (!source) {
            throw new Error(`Missing source "${pkg.source}" for skill "${pkg.name}"`);
          }
          return materializeRemoteSkill(
            store,
            pkg.name,
            {
              ...source,
              ref: source.type === 'git' ? source.commit : (source.ref ?? source.commit),
            },
            pkg.path,
          );
        }
        return materializeSkillFromLock(store, pkg);
      }),
  );
  const tools = await Promise.all(
    Object.values(lock.packages)
      .filter((pkg) => pkg.type === 'tool' && pkg.enabled)
      .map(async (pkg) => materializeToolFromLock(store, pkg)),
  );
  ensureLockMcpEnvFileEntries(store, lock);
  const { file: vscodeMcp } = syncVsCodeMcpConfig(store.getPaths(), lock);
  return { skills: [...skills, ...tools], vscodeMcp };
}

export function removeMaterializedFile(filePath: string): void {
  rmSync(filePath, { force: true });
}
