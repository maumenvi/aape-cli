import type { CatalogSource } from './source.ts';
import type { McpDependency, SkillDependency, ToolDependency } from './dependencies.ts';

export interface SourcesManifest {
  name: string;
  version: string;
  aapeVersion: string;
  config: {
    registryStrategy: 'hybrid';
    strictVerify: boolean;
    llmAccessDefault: 'allow' | 'deny';
  };
  sources: Record<string, CatalogSource>;
  skills: Record<string, SkillDependency>;
  mcps: Record<string, McpDependency>;
  tools: Record<string, ToolDependency>;
}
