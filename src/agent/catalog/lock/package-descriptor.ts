import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { normalizeVersion } from '../shared/index.ts';
import { resolveAllowedLlms, type AccessDefaultPolicy } from '../../access/policy.ts';
import type {
  CatalogKind,
  CatalogDependencyBase,
  LockPackage,
  McpDependency,
  RegistryEntry,
  SourceLock,
  ToolDependency,
} from '../types/index.ts';
import { computeLockIntegrity } from './integrity.ts';

export function createPackageDescriptor(
  kind: CatalogKind,
  name: string,
  dependency: CatalogDependencyBase,
  sourceInfo: SourceLock['sources'][string],
  registryEntry?: RegistryEntry,
  defaultAccessPolicy: AccessDefaultPolicy = 'allow',
  workspaceRoot = process.cwd(),
): LockPackage {
  const version = normalizeVersion(registryEntry?.version ?? dependency.version);
  const descriptor: LockPackage = {
    name,
    type: kind,
    version,
    source: dependency.source,
    resolvedFrom: dependency.version,
    path: dependency.path ?? registryEntry?.path ?? `${kind}s/${name}`,
    integrity: '',
    enabled: dependency.enabled ?? true,
    capabilities: [...(dependency.capabilities ?? registryEntry?.capabilities ?? [])],
    constraints: [...(dependency.constraints ?? [])],
    allowedLlms: resolveAllowedLlms(dependency.allowedLlms ?? registryEntry?.allowedLlms, defaultAccessPolicy),
    sourceCommit: sourceInfo.commit,
    provenance: {
      repo: sourceInfo.url,
      ref: sourceInfo.ref ?? 'main',
      trusted: sourceInfo.trusted ?? false,
    },
  };

  if (kind === 'mcp') {
    const mcpDependency = dependency as McpDependency;
    const vscodeConfig = mcpDependency.vscode ?? registryEntry?.vscode;
    if (!vscodeConfig) {
      throw new Error(`MCP "${name}" requires a "vscode" field in sources or registry`);
    }
    if (vscodeConfig.transport === 'http' && !vscodeConfig.url) {
      throw new Error(`MCP "${name}" requires "vscode.url" when transport is "http"`);
    }
    if (vscodeConfig.transport === 'sse' && !vscodeConfig.url) {
      throw new Error(`MCP "${name}" requires "vscode.url" when transport is "sse"`);
    }
    if (vscodeConfig.transport === 'ws' && !vscodeConfig.url) {
      throw new Error(`MCP "${name}" requires "vscode.url" when transport is "ws"`);
    }
    if (vscodeConfig.transport === 'npx' && !vscodeConfig.package) {
      throw new Error(`MCP "${name}" requires "vscode.package" when transport is "npx"`);
    }
    if ((vscodeConfig.transport === 'stdio' || typeof vscodeConfig.transport === 'undefined') && !vscodeConfig.command) {
      throw new Error(`MCP "${name}" requires "vscode.command" when transport is "stdio"`);
    }
    descriptor.vscode = vscodeConfig;
  }

  if (kind === 'tool') {
    const toolDependency = dependency as ToolDependency;
    descriptor.inputSchema = toolDependency.inputSchema ?? registryEntry?.inputSchema;
  }

  if (descriptor.path) {
    const resolvedPath = path.isAbsolute(descriptor.path)
      ? descriptor.path
      : path.resolve(workspaceRoot, descriptor.path);
    if (existsSync(resolvedPath) && statSync(resolvedPath).isFile()) {
      const hash = createHash('sha256').update(readFileSync(resolvedPath)).digest('hex');
      descriptor.artifactHash = `sha256:${hash}`;
    }
  }

  descriptor.integrity = computeLockIntegrity(descriptor);

  return descriptor;
}
