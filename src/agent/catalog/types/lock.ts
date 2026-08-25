import type { MCPConfig } from '../../tools/types.ts';
import type { CatalogKind } from './kinds.ts';
import type { CatalogSource } from './source.ts';

export interface LockPackage {
  name: string;
  type: CatalogKind;
  version: string;
  source: string;
  resolvedFrom: string;
  path: string;
  integrity: string;
  enabled: boolean;
  capabilities: string[];
  constraints: string[];
  allowedLlms: string[];
  sourceCommit?: string;
  provenance: {
    repo: string;
    ref: string;
    trusted: boolean;
  };
  vscode?: MCPConfig;
  inputSchema?: Record<string, unknown>;
}

export interface SourceLock {
  name: string;
  lockfileVersion: number;
  generatedAt: string;
  sources: Record<string, CatalogSource & { commit: string; commitResolved?: boolean }>;
  packages: Record<string, LockPackage>;
}
