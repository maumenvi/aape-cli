import type { McpDependency, SkillDependency, ToolDependency } from '../dependencies.ts';
import type { CatalogSource } from '../source.ts';
import type { AgentManifestEntry } from './agent-manifest-entry.ts';
import type { CatalogRegistryConfig } from './catalog-registry-config.ts';

/** Full sources manifest describing catalog registries and dependencies. */
export interface SourcesManifest {
  name: string;
  version: string;
  maiaVersion: string;
  config: {
    registryStrategy: 'hybrid';
    strictVerify: boolean;
    llmAccessDefault: 'allow' | 'deny';
  };
  registries: Record<string, CatalogRegistryConfig>;
  sources: Record<string, CatalogSource>;
  skills: Record<string, SkillDependency>;
  mcps: Record<string, McpDependency>;
  tools: Record<string, ToolDependency>;
  agents: Record<string, AgentManifestEntry>;
}
