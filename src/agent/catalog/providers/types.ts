import type { MCPConfig } from '../../tools/types.ts';
import type { CatalogKind, CatalogSource } from '../types/index.ts';

export interface GitHubSkillInstall {
  type: 'github';
  repository: string;
  skill: string;
}

export interface WellKnownSkillInstall {
  type: 'well-known';
  baseUrl: string;
  skill: string;
}

export interface McpInstall {
  type: 'mcp';
  vscode: MCPConfig;
}

export type CatalogInstall = GitHubSkillInstall | WellKnownSkillInstall | McpInstall;

export interface CatalogSearchResult {
  id: string;
  kind: CatalogKind;
  name: string;
  displayName: string;
  description?: string;
  provider: string;
  source: string;
  version?: string;
  installs?: number;
  install: CatalogInstall;
}

export interface ResolvedCatalogEntry {
  result: CatalogSearchResult;
  sourceAlias: string;
  source: CatalogSource;
}

export interface CatalogProvider {
  readonly id: string;
  readonly kinds: readonly CatalogKind[];
  search(query: string, limit?: number): Promise<CatalogSearchResult[]>;
  resolve(result: CatalogSearchResult): Promise<ResolvedCatalogEntry>;
}
