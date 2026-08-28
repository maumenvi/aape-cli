import type { MCPConfig } from '../../../tools/types.ts';
import type { CatalogDependencyBase } from './catalog-dependency-base.ts';

/** Manifest dependency entry for an MCP server. */
export interface McpDependency extends CatalogDependencyBase {
  vscode: MCPConfig;
}
