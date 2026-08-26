import type { CatalogSource } from './source.ts';
import type { McpDependency, SkillDependency, ToolDependency } from './dependencies.ts';

export interface CatalogRegistryConfig {
  provider: 'skills.sh' | 'github-skills' | 'mcp';
  url: string;
}

export interface AgentManifestEntry {
  id: string;
  name: string;
  enabled: boolean;
  addedAt: string;
}

export interface SourcesManifest {
  name: string;
  version: string;
  aapeVersion: string;
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
