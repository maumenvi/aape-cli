import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { syncVsCodeMcpConfig } from '../../agent/catalog/context/index.ts';
import { resolveRuntimeModulePath } from '../../agent/catalog/registry/index.ts';
import type { LockPackage, SourceLock } from '../../agent/catalog/types/index.ts';
import type { AgentCatalogStore } from '../../agent/catalog/store.ts';
import type { CatalogSource } from '../../agent/catalog/types/index.ts';
import { fetchRemoteSkillMarkdown } from './remote-skill.ts';

export { fetchRemoteSkillMarkdown } from './remote-skill.ts';

export function resolveWorkspaceRoot(store: Pick<AgentCatalogStore, 'getPaths'>): string {
  return path.dirname(store.getPaths().manifest);
}

export function resolveSkillsDir(store: Pick<AgentCatalogStore, 'getPaths'>): string {
  return path.resolve(resolveWorkspaceRoot(store), 'skills');
}

export function resolveSkillTargetPath(store: Pick<AgentCatalogStore, 'getPaths'>, name: string, sourcePath: string): string {
  const extension = path.extname(sourcePath) || '.ts';
  return path.resolve(resolveSkillsDir(store), `${name}${extension}`);
}

export function materializeSkill(store: Pick<AgentCatalogStore, 'getPaths'>, name: string, targetRelativePath?: string): string {
  const sourcePath = resolveRuntimeModulePath('skill', name);
  const targetPath = targetRelativePath
    ? path.resolve(resolveWorkspaceRoot(store), targetRelativePath)
    : resolveSkillTargetPath(store, name, sourcePath);
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, readFileSync(sourcePath, 'utf8'), 'utf8');
  return targetPath;
}

export function materializeSkillFromLock(store: Pick<AgentCatalogStore, 'getPaths'>, pkg: Pick<LockPackage, 'name' | 'path'>): string {
  return materializeSkill(store, pkg.name, pkg.path);
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

  const targetPath = path.resolve(resolveWorkspaceRoot(store), targetRelativePath);
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, markdown, 'utf8');
  return targetPath;
}

export async function reinstallFromLock(store: Pick<AgentCatalogStore, 'getPaths'>, lock: SourceLock): Promise<{ skills: string[]; vscodeMcp?: string }> {
  const skills = await Promise.all(
    Object.values(lock.packages)
      .filter((pkg) => pkg.type === 'skill' && pkg.enabled)
      .map(async (pkg) => {
        if (pkg.path.toLowerCase().endsWith('skill.md')) {
          const source = lock.sources[pkg.source];
          if (!source) {
            throw new Error(`Missing source "${pkg.source}" for skill "${pkg.name}"`);
          }
          return materializeRemoteSkill(store, pkg.name, source, pkg.path);
        }
        return materializeSkillFromLock(store, pkg);
      }),
  );
  const { file: vscodeMcp } = syncVsCodeMcpConfig(store.getPaths(), lock);
  return { skills, vscodeMcp };
}

export function removeMaterializedFile(filePath: string): void {
  rmSync(filePath, { force: true });
}
