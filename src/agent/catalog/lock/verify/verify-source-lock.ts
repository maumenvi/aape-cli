import { existsSync, readFileSync, statSync } from 'node:fs';

import type { SourceLock } from '../../types/lock/source-lock.ts';
import type { VerifySourceLockOptions } from '../verify-source-lock-options.ts';
import { fingerprintFile } from './fingerprint-file.ts';
import { resolvePackagePath } from './resolve-package-path.ts';
import { verifySourceLockMetadata } from './verify-source-lock-metadata.ts';

/** Verifies lock metadata and materialized artifacts without modifying the workspace. */
export function verifySourceLock(
  lock: SourceLock,
  workspaceRoot = process.cwd(),
  options: VerifySourceLockOptions = {},
): { ok: true } {
  verifySourceLockMetadata(lock);

  for (const [id, pkg] of Object.entries(lock.packages)) {
    if (!pkg.path) {
      continue;
    }

    const resolvedPath = resolvePackagePath(workspaceRoot, pkg.path);
    if (!existsSync(resolvedPath)) {
      if (pkg.artifactHash && !options.allowMissingArtifacts) {
        throw new Error(`Materialized package missing for ${id} at ${pkg.path}`);
      }
      continue;
    }

    const fileInfo = statSync(resolvedPath);
    if (!fileInfo.isFile()) {
      continue;
    }

    if (pkg.artifactHash) {
      const actual = fingerprintFile(resolvedPath);
      if (actual !== pkg.artifactHash) {
        throw new Error(`Artifact hash mismatch for ${id}`);
      }
      continue;
    }

    const fingerprint = readFileSync(resolvedPath, 'utf8');
    if (fingerprint.length === 0) {
      throw new Error(`Materialized package is empty for ${id} at ${pkg.path}`);
    }
  }
  return { ok: true };
}
