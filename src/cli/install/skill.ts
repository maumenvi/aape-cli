import path from 'node:path';
import { findRegistryEntry } from '../../agent/catalog/registry/index.ts';
import type { AgentCatalogStore } from '../../agent/catalog/store.ts';
import { materializeRemoteSkill, materializeSkill } from '../shared/workspace.ts';

export interface SkillInstallOptions {
  name: string;
  source: string;
  version: string;
  allowedLlms: string[];
}

export async function installSkill(store: AgentCatalogStore, options: SkillInstallOptions): Promise<void> {
  const manifest = store.loadManifest();
  const localEntry = options.source === 'local' ? findRegistryEntry('skill', options.name) : undefined;

  let targetPath: string;
  if (localEntry) {
    targetPath = materializeSkill(store, options.name);
  } else {
    const source = manifest.sources[options.source];
    if (!source) {
      throw new Error(`Unknown source "${options.source}" for skill "${options.name}"`);
    }
    targetPath = await materializeRemoteSkill(store, options.name, source);
  }

  store.addDependency('skill', options.name, {
    version: options.version,
    source: options.source,
    enabled: true,
    capabilities: [],
    constraints: [],
    allowedLlms: options.allowedLlms,
    path: path.relative(path.dirname(store.getPaths().manifest), targetPath).replaceAll('\\', '/'),
  });
  store.buildLock();
}
