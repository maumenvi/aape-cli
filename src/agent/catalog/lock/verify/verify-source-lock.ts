import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { SourceLock } from '../../types/index.ts';
import { verifySourceLockMetadata } from './verify-source-lock-metadata.ts';

/** Resolves a package path relative to the workspace when needed. */
function resolvePackagePath(workspaceRoot: string, relativeOrAbsolutePath: string): string {
  return relativeOrAbsolutePath.startsWith('/')
    ? relativeOrAbsolutePath
    : path.resolve(workspaceRoot, relativeOrAbsolutePath);
}

/** Computes the SHA-256 fingerprint for an on-disk file. */
function fingerprintFile(filePath: string): string {
  return `sha256:${createHash('sha256').update(readFileSync(filePath)).digest('hex')}`;
}

/** Verifies lockfile metadata and any materialized package artifacts. */
export function verifySourceLock(lock: SourceLock, workspaceRoot = process.cwd()): { ok: true } {
  verifySourceLockMetadata(lock);

  for (const [id, pkg] of Object.entries(lock.packages)) {
    if (!pkg.path) {
      continue;
    }

    const resolvedPath = resolvePackagePath(workspaceRoot, pkg.path);
    if (!existsSync(resolvedPath)) {
      if (pkg.artifactHash) {
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
