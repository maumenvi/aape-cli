import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { SourceLock } from '../types/index.ts';
import { computeLockIntegrity } from './integrity.ts';

function resolvePackagePath(workspaceRoot: string, relativeOrAbsolutePath: string): string {
  return relativeOrAbsolutePath.startsWith('/')
    ? relativeOrAbsolutePath
    : path.resolve(workspaceRoot, relativeOrAbsolutePath);
}

function fingerprintFile(filePath: string): string {
  return `sha256:${createHash('sha256').update(readFileSync(filePath)).digest('hex')}`;
}

export function verifySourceLock(lock: SourceLock, workspaceRoot = process.cwd()): { ok: true } {
  for (const [id, pkg] of Object.entries(lock.packages)) {
    const expected = computeLockIntegrity(pkg);
    if (pkg.integrity !== expected) {
      throw new Error(`Integrity mismatch for ${id}`);
    }

    if (!pkg.path) {
      continue;
    }

    const resolvedPath = resolvePackagePath(workspaceRoot, pkg.path);
    if (!existsSync(resolvedPath)) {
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
