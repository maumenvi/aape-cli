import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AccessDefaultPolicy } from '../../access/policy.ts';
import { agentRegistry, findAgent } from '../../agents/index.ts';
import { buildCatalogContexts, syncVsCodeMcpConfig } from '../context/index.ts';
import { buildLockFromManifest, verifySourceLock, verifySourceLockMetadata } from '../lock/index.ts';
import { createDefaultManifest, normalizeManifest } from '../manifest/index.ts';
import { resolveCatalogPaths } from '../paths/index.ts';
import {
  discoverRegistryEntries,
  removeManifestDependency,
  resolveRuntimeModulePath,
  setManifestDependency,
} from '../registry/index.ts';
import { mapDiscoverEntries, safeParseJson } from '../shared/index.ts';
import type {
  CatalogKind,
  CatalogSource,
  CatalogStoreOptions,
  LockPackage,
  McpDependency,
  SkillDependency,
  SourceLock,
  SourcesManifest,
  ToolDependency,
} from '../types/index.ts';

/** Reads, writes, and verifies catalog manifests, locks, and contexts. */
export class AgentCatalogStore {
  private readonly paths;

  /** Resolves catalog paths from the supplied store options. */
  constructor(options: CatalogStoreOptions = {}) {
    this.paths = resolveCatalogPaths(options);
  }

  /** Returns the resolved catalog file and context paths. */
  getPaths() {
    return this.paths;
  }

  /** Loads the sources manifest or returns the default manifest. */
  loadManifest(): SourcesManifest {
    if (!existsSync(this.paths.manifest)) {
      return createDefaultManifest();
    }
    const parsed = safeParseJson<Partial<SourcesManifest>>(readFileSync(this.paths.manifest, 'utf8'), this.paths.manifest);
    return normalizeManifest(parsed);
  }

  /** Returns the default LLM access policy from the manifest. */
  getLlmAccessDefault(): AccessDefaultPolicy {
    return this.loadManifest().config.llmAccessDefault;
  }

  /** Persists the default LLM access policy in the manifest. */
  setLlmAccessDefault(policy: AccessDefaultPolicy): void {
    const manifest = this.loadManifest();
    manifest.config.llmAccessDefault = policy;
    this.saveManifest(manifest);
  }

  /** Writes the sources manifest to disk. */
  saveManifest(manifest: SourcesManifest): void {
    writeFileSync(this.paths.manifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  /** Loads the source lockfile when present. */
  loadLock(): SourceLock | null {
    if (!existsSync(this.paths.lock)) {
      return null;
    }
    return safeParseJson<SourceLock>(readFileSync(this.paths.lock, 'utf8'), this.paths.lock);
  }

  /** Writes the source lockfile to disk. */
  saveLock(lock: SourceLock): void {
    writeFileSync(this.paths.lock, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
  }

  /** Adds or replaces a named catalog source. */
  addSource(alias: string, source: CatalogSource): void {
    const manifest = this.loadManifest();
    manifest.sources[alias] = source;
    this.saveManifest(manifest);
  }

  /** Adds or replaces a manifest dependency. */
  addDependency(kind: CatalogKind, name: string, dependency: SkillDependency | McpDependency | ToolDependency): void {
    const manifest = this.loadManifest();
    this.saveManifest(setManifestDependency(manifest, kind, name, dependency));
  }

  /** Saves the selected built-in agents in the manifest. */
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

  /** Removes a manifest dependency by kind and name. */
  removeDependency(kind: CatalogKind, name: string): void {
    const manifest = this.loadManifest();
    this.saveManifest(removeManifestDependency(manifest, kind, name));
  }

  /** Discovers registry entries and maps them for CLI display. */
  discover(
    kind: CatalogKind,
    query = '',
    limit = 10,
  ): Array<{ name: string; description: string; source: string; allowedLlms?: string[] }> {
    return mapDiscoverEntries(discoverRegistryEntries(kind, query, limit));
  }

  /** Builds and saves a lockfile from the current manifest. */
  buildLock(): SourceLock {
    const lock = buildLockFromManifest(this.loadManifest(), path.dirname(this.paths.manifest));
    this.saveLock(lock);
    return lock;
  }

  /** Verifies lockfile metadata and materialized package contents. */
  verifyLock(lock: SourceLock | null = this.loadLock()): { ok: true } {
    if (!lock) {
      throw new Error('source.lock not found. Run "maia lock" first.');
    }
    return verifySourceLock(lock, path.dirname(this.paths.manifest));
  }

  /** Verifies only the lockfile metadata integrity. */
  verifyLockMetadata(lock: SourceLock | null = this.loadLock()): { ok: true } {
    if (!lock) {
      throw new Error('source.lock not found. Run "maia lock" first.');
    }
    return verifySourceLockMetadata(lock);
  }

  /** Lists installed packages, optionally filtered by catalog kind. */
  getInstalledPackages(kind?: CatalogKind): LockPackage[] {
    const lock = this.loadLock();
    if (!lock) {
      return [];
    }
    const packages = Object.values(lock.packages);
    return kind ? packages.filter((pkg) => pkg.type === kind) : packages;
  }

  /** Loads a runtime module for an installed or built-in package. */
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

  /** Builds the developer and LLM catalog context files. */
  buildContexts() {
    const lock = this.loadLock() ?? this.buildLock();
    return buildCatalogContexts(this.paths, lock);
  }

  /** Synchronizes the VS Code MCP configuration from the lockfile. */
  syncVsCodeMcp() {
    const lock = this.loadLock() ?? this.buildLock();
    return syncVsCodeMcpConfig(this.paths, lock);
  }
}
