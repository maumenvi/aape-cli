import { normalizeAccessList } from '../../../access/policy.ts';
import type { LockPackage } from '../../types/index.ts';

/** Creates the stable payload used to compute package lock integrity. */
export function createLockIntegrityPayload(pkg: LockPackage) {
  return {
    name: pkg.name,
    type: pkg.type,
    version: pkg.version,
    source: pkg.source,
    resolvedFrom: pkg.resolvedFrom,
    path: pkg.path,
    enabled: pkg.enabled,
    capabilities: pkg.capabilities,
    constraints: pkg.constraints,
    allowedLlms: normalizeAccessList(pkg.allowedLlms),
    sourceCommit: pkg.sourceCommit ?? null,
    artifactHash: pkg.artifactHash ?? null,
    provenance: {
      repo: pkg.provenance.repo,
      ref: pkg.provenance.ref,
      trusted: pkg.provenance.trusted,
    },
    inputSchema: pkg.inputSchema ?? null,
    vscode: pkg.vscode ?? null,
  };
}
