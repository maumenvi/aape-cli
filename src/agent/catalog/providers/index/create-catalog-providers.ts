import type { CatalogRegistryConfig, SourcesManifest } from '../../types/index.ts';
import { GitHubSkillsProvider } from '../github-skills.ts';
import { McpRegistryProvider } from '../mcp-registry.ts';
import { SkillsShProvider } from '../skills-sh.ts';
import type { CatalogProvider } from '../types.ts';

/** Creates the concrete provider for a registry configuration. */
function createProvider(id: string, config: CatalogRegistryConfig): CatalogProvider {
  if (config.provider === 'skills.sh') {
    return new SkillsShProvider(id, config.url);
  }
  if (config.provider === 'github-skills') {
    return new GitHubSkillsProvider(id, config.url);
  }
  return new McpRegistryProvider(id, config.url);
}

/** Creates catalog providers for each configured registry. */
export function createCatalogProviders(manifest: Pick<SourcesManifest, 'registries'>): CatalogProvider[] {
  return Object.entries(manifest.registries).map(([id, config]) => createProvider(id, config));
}
