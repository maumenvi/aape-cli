import type { CatalogDependencyBase } from './catalog-dependency-base.ts';

/** Manifest dependency entry for a tool. */
export interface ToolDependency extends CatalogDependencyBase {
  inputSchema?: Record<string, unknown>;
}
