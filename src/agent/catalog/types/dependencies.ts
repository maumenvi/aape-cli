import type { MCPConfig } from '../../tools/types.ts';

export interface CatalogDependencyBase {
  version: string;
  source: string;
  enabled?: boolean;
  capabilities?: string[];
  constraints?: string[];
  allowedLlms?: string[];
}

export interface SkillDependency extends CatalogDependencyBase {}

export interface ToolDependency extends CatalogDependencyBase {
  inputSchema?: Record<string, unknown>;
}

export interface McpDependency extends CatalogDependencyBase {
  vscode: MCPConfig;
}
