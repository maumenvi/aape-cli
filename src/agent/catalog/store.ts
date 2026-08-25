import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
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
    const lock = buildLockFromManifest(this.loadManifest());
    this.saveLock(lock);
    return lock;
  }

  verifyLock(lock: SourceLock = this.loadLock() ?? this.buildLock()): { ok: true } {
    return verifySourceLock(lock);
  }

  getInstalledPackages(kind?: CatalogKind): LockPackage[] {
    const lock = this.loadLock();
    if (!lock) return [];
    const packages = Object.values(lock.packages);
    return kind ? packages.filter((pkg) => pkg.type === kind) : packages;
  }

  async loadRuntimeModule(kind: CatalogKind, name: string): Promise<unknown> {
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
