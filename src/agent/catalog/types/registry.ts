import type { MCPConfig } from '../../tools/types.ts';

export interface RegistryEntry {
  name: string;
  description: string;
  path: string;
  version?: string;
  usesTools?: string[];
  source?: string;
  capabilities?: string[];
  allowedLlms?: string[];
  inputSchema?: Record<string, unknown>;
  vscode?: MCPConfig;
}
