import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { agentRegistry, findAgent } from '../agents/index.ts';
import { buildCatalogContexts, syncVsCodeMcpConfig } from './context/index.ts';
import { buildLockFromManifest, verifySourceLock } from './lock/index.ts';
import { createDefaultManifest, normalizeManifest } from './manifest/index.ts';
import { resolveCatalogPaths } from './paths/index.ts';
import {
  discoverRegistryEntries,
  removeManifestDependency,
  resolveRuntimeModulePath,
  setManifestDependency,
} from './registry/index.ts';
import { mapDiscoverEntries, safeParseJson } from './shared/index.ts';
import type {
  CatalogKind,
  CatalogSource,
  CatalogStoreOptions,
  LockPackage,
  McpDependency,
  SourceLock,
  SourcesManifest,
  ToolDependency,
  SkillDependency,
} from './types/index.ts';
import type { AccessDefaultPolicy } from '../access/policy.ts';

export type {
  CatalogKind,
  CatalogSource,
  CatalogStoreOptions,
  LockPackage,
  McpDependency,
  SourceLock,
  SourcesManifest,
  ToolDependency,
  SkillDependency,
} from './types/index.ts';

export class AgentCatalogStore {
  private readonly paths;

  constructor(options: CatalogStoreOptions = {}) {
    this.paths = resolveCatalogPaths(options);
  }

  getPaths() {
    return this.paths;
  }

  loadManifest(): SourcesManifest {
    if (!existsSync(this.paths.manifest)) {
      return createDefaultManifest();
    }
    const parsed = safeParseJson<Partial<SourcesManifest>>(readFileSync(this.paths.manifest, 'utf8'), this.paths.manifest);
    return normalizeManifest(parsed);
  }

  getLlmAccessDefault(): AccessDefaultPolicy {
    return this.loadManifest().config.llmAccessDefault;
  }

  setLlmAccessDefault(policy: AccessDefaultPolicy): void {
    const manifest = this.loadManifest();
    manifest.config.llmAccessDefault = policy;
    this.saveManifest(manifest);
  }

  saveManifest(manifest: SourcesManifest): void {
    writeFileSync(this.paths.manifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  loadLock(): SourceLock | null {
    if (!existsSync(this.paths.lock)) {
      return null;
    }
    return safeParseJson<SourceLock>(readFileSync(this.paths.lock, 'utf8'), this.paths.lock);
  }

  saveLock(lock: SourceLock): void {
    writeFileSync(this.paths.lock, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
  }

  addSource(alias: string, source: CatalogSource): void {
    const manifest = this.loadManifest();
    manifest.sources[alias] = source;
    this.saveManifest(manifest);
  }

  addDependency(kind: CatalogKind, name: string, dependency: SkillDependency | McpDependency | ToolDependency): void {
    const manifest = this.loadManifest();
    this.saveManifest(setManifestDependency(manifest, kind, name, dependency));
  }

  saveSelectedAgents(agentIds: string[]): void {
    const manifest = this.loadManifest();
    const selected = new Map<string, { id: string; name: string; enabled: boolean; addedAt: string }>();

    for (const id of [...new Set(agentIds)]) {
      const target = findAgent(id) ?? agentRegistry.find((agent) => agent.id === id);
      const agentName = target?.name ?? id;
      selected.set(id, {
        id,
        name: agentName,
        enabled: true,
        addedAt: new Date().toISOString(),
      });
    }

    manifest.agents = {
      ...manifest.agents,
      ...Object.fromEntries(selected.entries()),
    };
    this.saveManifest(manifest);
  }

  removeDependency(kind: CatalogKind, name: string): void {
    const manifest = this.loadManifest();
    this.saveManifest(removeManifestDependency(manifest, kind, name));
  }

  discover(
    kind: CatalogKind,
    query = '',
    limit = 10,
  ): Array<{ name: string; description: string; source: string; allowedLlms?: string[] }> {
    return mapDiscoverEntries(discoverRegistryEntries(kind, query, limit));
  }

  buildLock(): SourceLock {
    const lock = buildLockFromManifest(this.loadManifest(), path.dirname(this.paths.manifest));
    this.saveLock(lock);
    return lock;
  }

  verifyLock(lock: SourceLock | null = this.loadLock()): { ok: true } {
    if (!lock) {
      throw new Error('source.lock not found. Run "maia lock" first.');
    }
    return verifySourceLock(lock, path.dirname(this.paths.manifest));
  }

  getInstalledPackages(kind?: CatalogKind): LockPackage[] {
    const lock = this.loadLock();
    if (!lock) {
      return [];
    }
    const packages = Object.values(lock.packages);
    return kind ? packages.filter((pkg) => pkg.type === kind) : packages;
  }

  async loadRuntimeModule(kind: CatalogKind, name: string): Promise<unknown> {
    const lock = this.loadLock();
    const match = lock ? Object.values(lock.packages).find((pkg) => pkg.type === kind && pkg.name === name) : undefined;
    if (match?.path) {
      const candidate = match.path.startsWith('/')
        ? match.path
        : path.resolve(path.dirname(this.paths.manifest), match.path);
      if (existsSync(candidate)) {
        if (candidate.endsWith('.md')) {
          const markdown = readFileSync(candidate, 'utf8');
          return {
            [kind]: {
              execute: async (_input: unknown) => ({
                kind,
                name,
                markdown,
              }),
            },
          };
        }
        return import(pathToFileURL(candidate).href);
      }
    }

    const targetPath = resolveRuntimeModulePath(kind, name);
    if (!existsSync(targetPath)) {
      throw new Error(`Runtime module not found for ${kind} "${name}" at ${targetPath}`);
    }
    return import(pathToFileURL(targetPath).href);
  }

  buildContexts() {
    const lock = this.loadLock() ?? this.buildLock();
    return buildCatalogContexts(this.paths, lock);
  }

  syncVsCodeMcp() {
    const lock = this.loadLock() ?? this.buildLock();
    return syncVsCodeMcpConfig(this.paths, lock);
  }
}

export function createAgentCatalogStore(options: CatalogStoreOptions = {}): AgentCatalogStore {
  return new AgentCatalogStore(options);
}
